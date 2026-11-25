import { balanceEquation, parseEquation } from '../src/chemistry/balance.js'
import { parseFormula } from '../src/chemistry/formula.js'
import { seedReactions } from '../src/data/reactionSeed.js'

export const seedSource = 'ChemLab — o‘quv reaksiyalari to‘plami'
export const seedSourceUrl = 'https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations'
export const rheaSource = 'Rhea expert-curated reaction knowledgebase'
export const rheaSourceUrl = 'https://www.rhea-db.org/'
export const chebiSourceUrl = 'https://www.ebi.ac.uk/chebi/'

export function canonicalReactionKey(equation) {
  const parsed = parseEquation(equation)
  const balanced = balanceEquation(equation)
  const reactants = parsed.reactants.map((compound, index) =>
    `${balanced.coefficients[index]}:${compound.formula}`,
  ).sort().join('|')
  const products = parsed.products.map((compound, index) =>
    `${balanced.coefficients[parsed.reactants.length + index]}:${compound.formula}`,
  ).sort().join('|')
  const forward = `${reactants}=>${products}`
  const reverse = `${products}=>${reactants}`
  return forward < reverse ? forward : reverse
}

export function calculateDifficulty(equation, coefficients) {
  const parsed = parseEquation(equation)
  const formulas = [...parsed.reactants, ...parsed.products].map(compound => compound.formula)
  const elements = new Set(formulas.flatMap(formula =>
    Object.keys(parseEquation(`${formula} -> ${formula}`).reactants[0].composition),
  ))
  const parentheses = formulas.reduce((count, formula) =>
    count + (formula.match(/[()[\]]/g) || []).length, 0)
  const largestCoefficient = Math.max(...coefficients.map(Number))
  const complexity = formulas.length + elements.size + parentheses + largestCoefficient
  if (complexity <= 12) return 'easy'
  if (complexity <= 22) return 'medium'
  return 'hard'
}

export function validateReaction(equation) {
  const parsed = parseEquation(equation)
  const result = balanceEquation(equation)
  if (!result.validation || result.coefficients.some(coefficient => !/^[1-9]\d*$/.test(coefficient))) {
    throw new Error('Reaction did not pass atom conservation and positive integer coefficient validation.')
  }
  const expectedKey = canonicalReactionKey(equation)
  return {
    reactants: parsed.reactants.map(compound => compound.formula),
    products: parsed.products.map(compound => compound.formula),
    questionEquation: `${parsed.reactants.map(compound => compound.formula).join(' + ')} -> ${parsed.products.map(compound => compound.formula).join(' + ')}`,
    balancedEquation: result.balanced,
    coefficients: result.coefficients,
    difficulty: calculateDifficulty(equation, result.coefficients),
    canonicalKey: expectedKey,
    atomCounts: result.atomCounts,
  }
}

export function getSeedRecords(date = new Date().toISOString()) {
  return seedReactions.map(([equation, category], index) => {
    const validated = validateReaction(equation)
    return {
      id: `chemlab-seed-${String(index + 1).padStart(3, '0')}`,
      ...validated,
      category,
      sourceName: seedSource,
      sourceUrl: seedSourceUrl,
      dateAdded: date,
      dateVerified: date,
      validationStatus: 'validated',
      externalId: null,
    }
  })
}

const rheaFormulaNames = new Map([
  ['water', 'H2O'],
  ['dihydrogen', 'H2'],
  ['dioxygen', 'O2'],
  ['hydrogen peroxide', 'H2O2'],
  ['carbon dioxide', 'CO2'],
  ['carbon monoxide', 'CO'],
  ['methane', 'CH4'],
  ['ammonia', 'NH3'],
  ['dinitrogen', 'N2'],
  ['nitrogen', 'N2'],
  ['chlorine', 'Cl2'],
])

export function rheaEquationToFormula(equation, chebiIds = [], formulaById = new Map()) {
  const sides = equation.split('=')
  if (sides.length !== 2) throw new Error('Rhea equation does not contain one equation separator.')
  const participants = sides.flatMap(side => side.split(/\s+\+\s+/).map(part => part.trim()))
  if (participants.length !== chebiIds.length) throw new Error('Rhea equation participants do not match its ChEBI identifiers.')
  const convertParticipant = (part, participantIndex) => {
    const match = part.trim().match(/^(\d+)\s+(.+)$/)
    const coefficient = match ? Number(match[1]) : 1
    const name = (match ? match[2] : part).trim().toLowerCase()
    const chebiId = chebiIds[participantIndex]
    const chebi = formulaById.get(chebiId)
    if (chebi && chebi.charge !== 0) throw new Error(`Rhea participant ${chebiId} is charged; charged species are not included in this atom-only quiz.`)
    let formula = chebi?.formula || rheaFormulaNames.get(name)
    if (!formula) {
      try { parseFormula(name); formula = name }
      catch { throw new Error(`Rhea participant "${name}" has no unambiguous supported formula mapping.`) }
    }
    parseFormula(formula)
    return `${coefficient === 1 ? '' : coefficient}${formula}`
  }
  let participantIndex = 0
  const convertSide = side => side.split(/\s+\+\s+/).map(part =>
    convertParticipant(part.trim(), participantIndex++),
  ).join(' + ')
  return `${convertSide(sides[0])} -> ${convertSide(sides[1])}`
}

export function parseRheaTsv(tsv, now = new Date().toISOString(), formulaById = new Map()) {
  const [header, ...lines] = tsv.trim().split(/\r?\n/)
  if (header !== 'Reaction identifier\tEquation\tChEBI identifier') {
    throw new Error('Rhea returned an unexpected TSV header.')
  }
  let skipped = 0
  const records = []
  for (const line of lines) {
    if (!line.trim()) continue
    const [externalId, sourceEquation, participantIds] = line.split('\t')
    try {
      const chebiIds = participantIds.split(';').map(id => id.trim())
      if (!/^RHEA:\d+$/.test(externalId) || chebiIds.some(id => !/^CHEBI:\d+$/.test(id))) throw new Error('Invalid source accession.')
      const equation = rheaEquationToFormula(sourceEquation, chebiIds, formulaById)
      const validated = validateReaction(equation)
      records.push({
        id: externalId.toLowerCase().replace(':', '-'),
        ...validated,
        category: 'biochemical',
        sourceName: rheaSource,
        sourceUrl: `https://www.rhea-db.org/rhea/${externalId.slice(5)}`,
        formulaSourceUrl: chebiSourceUrl,
        dateAdded: now,
        dateVerified: now,
        validationStatus: 'validated',
        externalId,
      })
    } catch {
      skipped++
    }
  }
  return { records, skipped }
}
