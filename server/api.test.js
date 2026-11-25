import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase, getSyncValues } from './database.js'
import { getSeedRecords } from './reactionCatalog.js'
import { createApiServer } from './http.js'
import { createSyncCoordinator, syncRhea, startSyncScheduler } from './sync.js'

async function withApi(callback, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chemlab-test-'))
  const db = openDatabase(path.join(directory, 'test.sqlite'))
  const server = createApiServer(db, options)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  try { await callback({ db, baseUrl }) }
  finally {
    await new Promise(resolve => server.close(resolve))
    db.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

test('keeps test questions and coefficients server-side until all 20 answers are submitted', async () => {
  await withApi(async ({ db, baseUrl }) => {
    const startedResponse = await fetch(`${baseUrl}/api/tests`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ difficulty: 'all' }),
    })
    assert.equal(startedResponse.status, 201)
    const started = await startedResponse.json()
    assert.equal(started.total, 20)
    assert.ok(!('coefficients' in started.question))
    const earlyResults = await fetch(`${baseUrl}/api/tests/${started.sessionId}/results`)
    assert.equal(earlyResults.status, 409)

    for (let index = 0; index < 20; index++) {
      const questionResponse = await fetch(`${baseUrl}/api/tests/${started.sessionId}/question?index=${index}`)
      const question = await questionResponse.json()
      assert.equal(question.index, index)
      const session = db.prepare('SELECT question_ids_json FROM test_sessions WHERE id = ?').get(started.sessionId)
      const reactionId = JSON.parse(session.question_ids_json)[index]
      const coefficients = JSON.parse(db.prepare('SELECT coefficients_json FROM reactions WHERE id = ?').get(reactionId).coefficients_json)
      const answered = await fetch(`${baseUrl}/api/tests/${started.sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, coefficients }),
      })
      assert.equal(answered.status, 200)
    }

    const finalResponse = await fetch(`${baseUrl}/api/tests/${started.sessionId}/results`)
    const results = await finalResponse.json()
    assert.equal(results.total, 20)
    assert.equal(results.correct, 20)
    assert.equal(results.percentage, 100)
  })
})

test('preserves distinct answers submitted concurrently', async () => {
  await withApi(async ({ db, baseUrl }) => {
    const startedResponse = await fetch(`${baseUrl}/api/tests`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ difficulty: 'all' }),
    })
    const { sessionId } = await startedResponse.json()
    const questionIds = JSON.parse(db.prepare('SELECT question_ids_json FROM test_sessions WHERE id = ?').get(sessionId).question_ids_json)
    const submissions = [0, 1].map(index => {
      const coefficients = JSON.parse(db.prepare('SELECT coefficients_json FROM reactions WHERE id = ?').get(questionIds[index]).coefficients_json)
      return fetch(`${baseUrl}/api/tests/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, coefficients }),
      })
    })
    const responses = await Promise.all(submissions)
    assert.deepEqual(responses.map(response => response.status), [200, 200])
    const answers = JSON.parse(db.prepare('SELECT answers_json FROM test_sessions WHERE id = ?').get(sessionId).answers_json)
    assert.deepEqual(Object.keys(answers).sort(), ['0', '1'])
  })
})

test('saves reactions and sessions across database restarts', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chemlab-persist-'))
  const file = path.join(directory, 'test.sqlite')
  const first = openDatabase(file)
  const before = first.prepare('SELECT COUNT(*) AS count FROM reactions').get().count
  first.close()
  const second = openDatabase(file)
  const after = second.prepare('SELECT COUNT(*) AS count FROM reactions').get().count
  assert.equal(after, before)
  assert.ok(after > 20)
  second.close()
  fs.rmSync(directory, { recursive: true, force: true })
})

test('online update failure is recorded while offline reaction pool remains usable', async () => {
  await withApi(async ({ db }) => {
    await assert.rejects(syncRhea(db, { fetchImpl: async () => { throw new Error('offline') } }), /offline/)
    const status = getSyncValues(db)
    assert.equal(status.last_error, 'offline')
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM reactions WHERE validation_status='validated'").get().count, getSeedRecords().length)
  })
})

test('successful sync imports only validated rows and records source timestamps', async () => {
  await withApi(async ({ db, baseUrl }) => {
    const tsv = [
      'Reaction identifier\tEquation\tChEBI identifier',
      'RHEA:20000\tethane + chlorine = chloroethane + hydrogen chloride\tCHEBI:90001;CHEBI:90002;CHEBI:90003;CHEBI:90004',
      'RHEA:20004\tunknown participant = water\tCHEBI:90005;CHEBI:90006',
      'RHEA:20008\t2 dihydrogen + dioxygen = 2 water\tCHEBI:90007;CHEBI:90008;CHEBI:90009',
    ].join('\n')
    const result = await syncRhea(db, {
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      fetchImpl: async url => {
        if (new URL(url).hostname === 'www.rhea-db.org') return new Response(tsv, { status: 200 })
        return Response.json({
          'CHEBI:90001': { data: { chemical_data: { formula: 'C2H6', charge: 0 } } },
          'CHEBI:90002': { data: { chemical_data: { formula: 'Cl2', charge: 0 } } },
          'CHEBI:90003': { data: { chemical_data: { formula: 'C2H5Cl', charge: 0 } } },
          'CHEBI:90004': { data: { chemical_data: { formula: 'HCl', charge: 0 } } },
          'CHEBI:90005': { data: { chemical_data: { formula: 'C2H2', charge: 0 } } },
          'CHEBI:90006': { data: { chemical_data: { formula: 'H2O', charge: 0 } } },
          'CHEBI:90007': { data: { chemical_data: { formula: 'H2', charge: 0 } } },
          'CHEBI:90008': { data: { chemical_data: { formula: 'O2', charge: 0 } } },
          'CHEBI:90009': { data: { chemical_data: { formula: 'H2O', charge: 0 } } },
        })
      },
    })
    assert.deepEqual(
      { imported: result.imported, skipped: result.skipped, duplicates: result.duplicates, checked: result.checked },
      { imported: 1, skipped: 1, duplicates: 1, checked: 3 },
    )
    const saved = getSyncValues(db)
    assert.equal(saved.last_success_at, '2026-01-01T00:00:00.000Z')
    assert.equal(saved.last_imported_count, '1')
    assert.equal(saved.last_duplicate_count, '1')
    assert.equal(saved.last_checked_rows, '3')
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM reactions').get().count, getSeedRecords().length + 1)
    const imported = db.prepare("SELECT source_url, formula_source_url, date_verified FROM reactions WHERE external_id = 'RHEA:20000'").get()
    assert.equal(imported.source_url, 'https://www.rhea-db.org/rhea/20000')
    assert.equal(imported.formula_source_url, 'https://www.ebi.ac.uk/chebi/')
    assert.equal(imported.date_verified, '2026-01-01T00:00:00.000Z')
    assert.equal(result.lookupFailures, 0)
    assert.equal(result.limited, 0)
    const meta = await (await fetch(`${baseUrl}/api/reactions/meta`)).json()
    assert.equal(meta.lastCheckedRows, 3)
    assert.equal(meta.lastDuplicates, 1)
  })
})

test('weekly scheduler checks only when due and does not repeat on every page request', async () => {
  await withApi(async ({ db }) => {
    let runs = 0
    const stop = startSyncScheduler(db, {
      sync: async () => { runs++; db.prepare("INSERT OR REPLACE INTO sync_state VALUES ('last_success_at', ?)").run(new Date().toISOString()) },
      intervalMs: 1_000_000,
    })
    await new Promise(resolve => setTimeout(resolve, 20))
    stop()
    assert.equal(runs, 1)
    assert.ok(getSyncValues(db).last_success_at)
  })
})

test('coalesces concurrent source synchronization requests', async () => {
  let release
  let runs = 0
  const pending = new Promise(resolve => { release = resolve })
  const sync = createSyncCoordinator(async () => {
    runs++
    await pending
    return { imported: runs }
  })
  const first = sync()
  const second = sync()
  assert.equal(first, second)
  release()
  assert.deepEqual(await Promise.all([first, second]), [{ imported: 1 }, { imported: 1 }])
  assert.equal(runs, 1)
})
