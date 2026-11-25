import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { getSeedRecords } from './reactionCatalog.js'

const insertReaction = `
  INSERT OR IGNORE INTO reactions (
    id, external_id, canonical_key, reactants_json, products_json,
    question_equation, balanced_equation, coefficients_json, difficulty, category, source_name,
    formula_source_url,
    source_url, date_added, date_verified, validation_status
  ) VALUES (
    @id, @externalId, @canonicalKey, @reactants, @products,
    @questionEquation, @balancedEquation, @coefficients, @difficulty, @category, @sourceName,
    @formulaSourceUrl,
    @sourceUrl, @dateAdded, @dateVerified, @validationStatus
  )
`

export function openDatabase(filePath = process.env.CHEMLAB_DATABASE || 'data/chemlab.sqlite') {
  const resolvedPath = path.resolve(filePath)
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
  const db = new Database(resolvedPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      external_id TEXT UNIQUE,
      canonical_key TEXT NOT NULL UNIQUE,
      reactants_json TEXT NOT NULL,
      products_json TEXT NOT NULL,
      question_equation TEXT NOT NULL,
      balanced_equation TEXT NOT NULL,
      coefficients_json TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      category TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      formula_source_url TEXT NOT NULL,
      date_added TEXT NOT NULL,
      date_verified TEXT NOT NULL,
      validation_status TEXT NOT NULL CHECK (validation_status = 'validated')
    );
    CREATE TABLE IF NOT EXISTS test_sessions (
      id TEXT PRIMARY KEY,
      difficulty TEXT NOT NULL,
      question_ids_json TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed'))
    );
    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chebi_compounds (
      chebi_id TEXT PRIMARY KEY,
      formula TEXT NOT NULL,
      charge INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  const reactionColumns = new Set(db.prepare('PRAGMA table_info(reactions)').all().map(row => row.name))
  if (!reactionColumns.has('formula_source_url')) {
    db.exec("ALTER TABLE reactions ADD COLUMN formula_source_url TEXT NOT NULL DEFAULT ''")
    db.exec("UPDATE reactions SET formula_source_url = source_url WHERE formula_source_url = ''")
  }

  const insert = db.prepare(insertReaction)
  const seed = db.transaction(() => {
    for (const record of getSeedRecords()) {
      insert.run({
        ...record,
        reactants: JSON.stringify(record.reactants),
        products: JSON.stringify(record.products),
        coefficients: JSON.stringify(record.coefficients),
        formulaSourceUrl: record.formulaSourceUrl || record.sourceUrl,
      })
    }
  })
  seed()
  return db
}

export function insertValidatedReaction(db, record) {
  return db.prepare(insertReaction).run({
    ...record,
    reactants: JSON.stringify(record.reactants),
    products: JSON.stringify(record.products),
    coefficients: JSON.stringify(record.coefficients),
    formulaSourceUrl: record.formulaSourceUrl || record.sourceUrl,
  }).changes > 0
}

export function getReactionCounts(db) {
  const rows = db.prepare(`
    SELECT difficulty, COUNT(*) AS count
    FROM reactions
    WHERE validation_status = 'validated'
    GROUP BY difficulty
  `).all()
  return Object.fromEntries(['easy', 'medium', 'hard'].map(level => [
    level,
    rows.find(row => row.difficulty === level)?.count || 0,
  ]))
}

export function setSyncValue(db, key, value) {
  db.prepare('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)').run(key, String(value))
}

export function getSyncValues(db) {
  return Object.fromEntries(db.prepare('SELECT key, value FROM sync_state').all().map(row => [row.key, row.value]))
}
