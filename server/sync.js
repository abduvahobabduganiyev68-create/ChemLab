import { insertValidatedReaction, setSyncValue } from './database.js'
import { parseRheaTsv, rheaSourceUrl } from './reactionCatalog.js'
import { parseFormula } from '../src/chemistry/formula.js'

const RHEA_ENDPOINT = 'https://www.rhea-db.org/rhea/'
const RHEA_LIMIT = 20_000
const MAX_RESPONSE_BYTES = 15 * 1024 * 1024
const CHEBI_ENDPOINT = 'https://www.ebi.ac.uk/chebi/backend/api/public/compounds/'
const MAX_CACHED_CHEBI_IDS_PER_SYNC = 4_000
const CHEBI_BATCH_SIZE = 80
const CHEBI_CONCURRENCY = 4
const UPDATE_INTERVAL_MS = Number(process.env.REACTION_SYNC_INTERVAL_MS) || 7 * 24 * 60 * 60 * 1000
const SYNC_VERSION = 'rhea-chebi-formula-v1'

export function createSyncCoordinator(sync) {
  let inFlight
  return (...args) => {
    if (inFlight) return inFlight
    inFlight = Promise.resolve()
      .then(() => sync(...args))
      .finally(() => { inFlight = null })
    return inFlight
  }
}

export async function fetchWithRetry(fetchImpl, url, options, attempts = 3) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetchImpl(url, options)
      if (response.ok || (response.status < 500 && response.status !== 429)) return response
      lastError = new Error(`Upstream returned HTTP ${response.status}.`)
    } catch (error) {
      lastError = error
    }
    if (attempt + 1 < attempts) {
      await new Promise(resolve => setTimeout(resolve, 200 * (2 ** attempt)))
    }
  }
  throw lastError || new Error('Upstream request failed.')
}

async function lookupChebiFormulas(db, ids, fetchImpl, verifiedAt) {
  const allUniqueIds = [...new Set(ids)]
  const formulas = new Map()
  const lookup = db.prepare('SELECT formula, charge FROM chebi_compounds WHERE chebi_id = ?')
  const save = db.prepare(`
    INSERT OR REPLACE INTO chebi_compounds (chebi_id, formula, charge, updated_at)
    VALUES (?, ?, ?, ?)
  `)
  const missing = []
  const attemptedIds = new Set()

  for (const id of allUniqueIds) {
    const cached = lookup.get(id)
    if (cached) formulas.set(id, cached)
    else if (missing.length < MAX_CACHED_CHEBI_IDS_PER_SYNC) missing.push(id)
  }

  const batches = []
  for (let offset = 0; offset < missing.length; offset += CHEBI_BATCH_SIZE) {
    batches.push(missing.slice(offset, offset + CHEBI_BATCH_SIZE))
  }
  let lookupFailures = 0
  let nextBatch = 0
  const workers = Array.from({ length: Math.min(CHEBI_CONCURRENCY, batches.length) }, async () => {
    while (nextBatch < batches.length) {
      const batch = batches[nextBatch++]
      batch.forEach(id => attemptedIds.add(id))
      try {
        const url = new URL(CHEBI_ENDPOINT)
        url.searchParams.set('chebi_ids', batch.join(','))
        const response = await fetchWithRetry(fetchImpl, url, {
          headers: { Accept: 'application/json', 'User-Agent': 'ChemLab educational reaction catalogue' },
          signal: AbortSignal.timeout(15_000),
        })
        if (!response.ok) throw new Error(`ChEBI returned HTTP ${response.status}.`)
        const data = await response.json()
        for (const id of batch) {
          const compound = data[id]?.data?.chemical_data
          if (!compound || typeof compound.formula !== 'string' || !Number.isInteger(compound.charge)) continue
          try {
            const record = { formula: compound.formula, charge: compound.charge }
            parseFormula(record.formula)
            formulas.set(id, record)
            save.run(id, record.formula, record.charge, verifiedAt)
          } catch {
            // Unsupported molecular formulae are not cached or used for imports.
          }
        }
      } catch (error) {
        lookupFailures += batch.length
        console.error(`[reaction-sync] ChEBI batch lookup failed: ${error.message}`)
      }
    }
  })
  await Promise.all(workers)
  const limited = allUniqueIds.filter(id => !formulas.has(id) && !attemptedIds.has(id)).length
  return { formulas, lookupFailures, limited }
}

export async function syncRhea(db, {
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  const started = now().toISOString()
  setSyncValue(db, 'last_attempt_at', started)
  const url = new URL(RHEA_ENDPOINT)
  url.searchParams.set('query', '')
  url.searchParams.set('columns', 'rhea-id,equation,chebi-id')
  url.searchParams.set('format', 'tsv')
  url.searchParams.set('limit', String(RHEA_LIMIT))

  try {
    const response = await fetchWithRetry(fetchImpl, url, {
      headers: { Accept: 'text/tab-separated-values', 'User-Agent': 'ChemLab educational reaction catalogue' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw new Error(`Rhea returned HTTP ${response.status}.`)
    const tsv = await response.text()
    if (new TextEncoder().encode(tsv).byteLength > MAX_RESPONSE_BYTES) {
      throw new Error('Rhea response exceeded the configured 15 MB limit.')
    }

    const header = 'Reaction identifier\tEquation\tChEBI identifier'
    const lines = tsv.trim().split(/\r?\n/)
    if (lines[0] !== header) throw new Error('Rhea returned an unexpected TSV header.')
    const chebiIds = lines.slice(1).flatMap(line => {
      const participantIds = line.split('\t')[2]
      return participantIds ? participantIds.split(';').map(id => id.trim()).filter(Boolean) : []
    })
    const verifiedAt = now().toISOString()
    const { formulas, lookupFailures, limited } = await lookupChebiFormulas(db, chebiIds, fetchImpl, verifiedAt)
    const { records, skipped } = parseRheaTsv(tsv, verifiedAt, formulas)
    let imported = 0
    const transaction = db.transaction(() => {
      records.forEach(record => { if (insertValidatedReaction(db, record)) imported++ })
    })
    transaction()

    const completed = now().toISOString()
    const duplicates = records.length - imported
    const checked = records.length + skipped
    setSyncValue(db, 'last_success_at', completed)
    setSyncValue(db, 'last_error', '')
    setSyncValue(db, 'last_imported_count', imported)
    setSyncValue(db, 'last_skipped_count', skipped)
    setSyncValue(db, 'last_duplicate_count', duplicates)
    setSyncValue(db, 'last_checked_rows', checked)
    setSyncValue(db, 'last_lookup_failures', lookupFailures)
    setSyncValue(db, 'last_limited_chebi_count', limited)
    setSyncValue(db, 'last_source_url', rheaSourceUrl)
    setSyncValue(db, 'sync_version', SYNC_VERSION)
    return { imported, skipped, duplicates, checked, lookupFailures, limited, completedAt: completed }
  } catch (error) {
    setSyncValue(db, 'last_error', error.message)
    throw error
  }
}

export function startSyncScheduler(db, {
  sync = () => syncRhea(db),
  intervalMs = UPDATE_INTERVAL_MS,
  now = () => Date.now(),
} = {}) {
  const due = () => {
    const lastSuccess = db.prepare("SELECT value FROM sync_state WHERE key = 'last_success_at'").get()?.value
    const syncVersion = db.prepare("SELECT value FROM sync_state WHERE key = 'sync_version'").get()?.value
    return syncVersion !== SYNC_VERSION || !lastSuccess || now() - Date.parse(lastSuccess) >= intervalMs
  }
  const runIfDue = async () => {
    if (!due()) return
    try { await sync() } catch (error) {
      console.error(`[reaction-sync] Update failed: ${error.message}`)
    }
  }

  void runIfDue()
  const timer = setInterval(() => { void runIfDue() }, Math.min(intervalMs, 6 * 60 * 60 * 1000))
  timer.unref()
  return () => clearInterval(timer)
}
