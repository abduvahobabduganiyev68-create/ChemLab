import test from 'node:test'
import assert from 'node:assert/strict'
import { balanceEquation, parseEquation } from './balance.js'
import { parseFormula } from './formula.js'

const expected = new Map([
  ['H2 + O2 -> H2O', '2H2 + O2 → 2H2O'],
  ['Fe + HCl -> FeCl2 + H2', 'Fe + 2HCl → FeCl2 + H2'],
  ['Al + HCl -> AlCl3 + H2', '2Al + 6HCl → 2AlCl3 + 3H2'],
  ['Na + Cl2 -> NaCl', '2Na + Cl2 → 2NaCl'],
  ['Mg + O2 -> MgO', '2Mg + O2 → 2MgO'],
  ['KClO3 -> KCl + O2', '2KClO3 → 2KCl + 3O2'],
  ['CaCO3 -> CaO + CO2', 'CaCO3 → CaO + CO2'],
  ['NH3 + O2 -> NO + H2O', '4NH3 + 5O2 → 4NO + 6H2O'],
  ['Ca(OH)2 + HCl -> CaCl2 + H2O', 'Ca(OH)2 + 2HCl → CaCl2 + 2H2O'],
  ['Al2(SO4)3 + Ca(OH)2 -> Al(OH)3 + CaSO4', 'Al2(SO4)3 + 3Ca(OH)2 → 2Al(OH)3 + 3CaSO4'],
])

test('parses nested parentheses and square-bracket groups', () => {
  assert.deepEqual(parseFormula('Ca(OH)2'), { Ca: 1, O: 2, H: 2 })
  assert.deepEqual(parseFormula('Al2(SO4)3'), { Al: 2, S: 3, O: 12 })
  assert.deepEqual(parseFormula('[Fe(CN)6]'), { Fe: 1, C: 6, N: 6 })
  assert.deepEqual(parseFormula('K4[ON(SO3)2]2'), { K: 4, O: 14, N: 2, S: 4 })
})

test('rejects invalid formula syntax and element symbols', () => {
  for (const formula of ['H0', 'Xx2', 'Ca(OH]2', 'Ca()2', 'H2O)', '2H2O', 'H2.5O', 'C a']) {
    assert.throws(() => parseFormula(formula), undefined, formula)
  }
})

test('balances every requested user-entered equation and verifies atom counts', () => {
  for (const [input, balanced] of expected) {
    const result = balanceEquation(input)
    assert.equal(result.balanced, balanced, input)
    assert.equal(result.validation, true, input)
    assert.ok(result.atomCounts.every(row => row.reactants === row.products), input)
  }
})

test('recognizes equations that already have balanced coefficients', () => {
  const result = balanceEquation('2H2 + O2 -> 2H2O')
  assert.equal(result.alreadyBalanced, true)
  assert.equal(result.balanced, '2H2 + O2 → 2H2O')
  assert.equal(balanceEquation('H2 + O2 -> H2O').alreadyBalanced, false)
})

test('parses supported arrows, sides, whitespace, and input coefficients', () => {
  const equation = parseEquation('  2H2 + O2 = 2H2O ')
  assert.equal(equation.reactants.length, 2)
  assert.equal(equation.products.length, 1)
  assert.equal(equation.reactants[0].inputCoefficient, 2)
  assert.equal(balanceEquation('H2 + O2 → H2O').balanced, '2H2 + O2 → 2H2O')
})

test('reports missing sides, missing arrows, and malformed equations', () => {
  for (const equation of ['-> H2O', 'H2 + O2 ->', 'H2 + O2', 'H2 + + O2 -> H2O', 'H2 -> H2O -> O2', 'H2 => H2O']) {
    assert.throws(() => balanceEquation(equation), undefined, equation)
  }
})

test('reports equations with no positive balance or ambiguous balance', () => {
  assert.throws(() => balanceEquation('H2 -> O2'), /faqat nol yechim|musbat koeffitsiyentli balans/)
  assert.throws(() => balanceEquation('H2 + O2 -> H2O + H2O2'), /aniqlanmagan/)
})
