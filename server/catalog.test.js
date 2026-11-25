import test from 'node:test'
import assert from 'node:assert/strict'
import { getSeedRecords, parseRheaTsv, rheaEquationToFormula, validateReaction } from './reactionCatalog.js'

test('provides a persisted fallback pool with at least 20 validated reactions per difficulty', () => {
  const records = getSeedRecords()
  assert.ok(records.length >= 20)
  for (const difficulty of ['easy', 'medium', 'hard']) {
    assert.ok(records.filter(record => record.difficulty === difficulty).length >= 20, difficulty)
  }
  assert.equal(new Set(records.map(record => record.canonicalKey)).size, records.length)
  assert.ok(records.every(record => record.validationStatus === 'validated' && record.sourceUrl))
})

test('validates new, non-seed equations and records derived balancing metadata', () => {
  const record = validateReaction('2Na + Cl2 -> 2NaCl')
  assert.equal(record.balancedEquation, '2Na + Cl2 → 2NaCl')
  assert.deepEqual(record.coefficients, ['2', '1', '2'])
  assert.equal(record.questionEquation, 'Na + Cl2 -> NaCl')
})

test('only maps explicit, unambiguous Rhea participant names to formulas', () => {
  const ids = ['CHEBI:1', 'CHEBI:2', 'CHEBI:3']
  const formulas = new Map([
    ['CHEBI:1', { formula: 'H2', charge: 0 }],
    ['CHEBI:2', { formula: 'O2', charge: 0 }],
    ['CHEBI:3', { formula: 'H2O', charge: 0 }],
  ])
  assert.equal(rheaEquationToFormula('2 dihydrogen + dioxygen = 2 water', ids, formulas), '2H2 + O2 -> 2H2O')
  assert.equal(rheaEquationToFormula('2 carbon monoxide + dioxygen = 2 carbon dioxide', ids, new Map()), '2CO + O2 -> 2CO2')
  assert.throws(() => rheaEquationToFormula('benzyl isothiocyanate = water', ['CHEBI:4', 'CHEBI:5']), /no unambiguous/)
})

test('imports verified, formula-mapped Rhea rows and skips unsupported names', () => {
  const parsed = parseRheaTsv([
    'Reaction identifier\tEquation\tChEBI identifier',
    'RHEA:20000\tmethane + 2 dioxygen = carbon dioxide + 2 water\tCHEBI:1;CHEBI:2;CHEBI:3;CHEBI:4',
    'RHEA:20004\tbenzyl isothiocyanate = benzyl thiocyanate\tCHEBI:5;CHEBI:6',
  ].join('\n'), '2026-01-01T00:00:00.000Z')
  assert.equal(parsed.records.length, 1)
  assert.equal(parsed.skipped, 1)
  assert.equal(parsed.records[0].externalId, 'RHEA:20000')
  assert.equal(parsed.records[0].balancedEquation, 'CH4 + 2O2 → CO2 + 2H2O')
})

test('rejects unexpected upstream response format rather than reporting fake success', () => {
  assert.throws(() => parseRheaTsv('id\treaction\nRHEA:1\twater = water'), /unexpected TSV header/)
})
