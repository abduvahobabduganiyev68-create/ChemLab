import { parseFormula } from './formula.js'

function gcd(a, b) {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) [a, b] = [b, a % b]
  return a || 1n
}

function rational(numerator, denominator = 1n) {
  if (denominator === 0n) throw new Error('Balanslashda nolga bo‘lish holati yuz berdi.')
  const sign = denominator < 0n ? -1n : 1n
  const divisor = gcd(numerator, denominator)
  return { n: (numerator / divisor) * sign, d: (denominator / divisor) * sign }
}

const subtract = (a, b) => rational(a.n * b.d - b.n * a.d, a.d * b.d)
const multiply = (a, b) => rational(a.n * b.n, a.d * b.d)
const divide = (a, b) => rational(a.n * b.d, a.d * b.n)

export function parseEquation(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Kimyoviy tenglamani kiriting. Balanslash uchun mahsulotlar ham kerak.')
  }

  const arrows = [...input.matchAll(/->|→|=/g)]
  if (arrows.length === 0) {
    throw new Error('Tenglama o‘qini kiriting (->, → yoki =). Faqat reagentlardan mahsulotni bashorat qilib bo‘lmaydi.')
  }
  if (arrows.length > 1) throw new Error('Tenglamada faqat bitta reaksiya o‘qi bo‘lishi kerak.')

  const arrow = arrows[0]
  const leftText = input.slice(0, arrow.index).trim()
  const rightText = input.slice(arrow.index + arrow[0].length).trim()
  if (!leftText) throw new Error('Reagentlar tomoni bo‘sh. O‘qning chap tomoniga formulalarni kiriting.')
  if (!rightText) throw new Error('Mahsulotlar tomoni bo‘sh. Mahsulot formulalarini ham kiriting; mahsulot bashoratlash bu vositada mavjud emas.')

  function parseSide(sideText, sideName) {
    const formulas = sideText.split('+')
    if (formulas.some(formula => !formula.trim())) {
      throw new Error(`${sideName} tomonida bo‘sh birikma bor. Formulalarni "+" bilan to‘g‘ri ajrating.`)
    }
    return formulas.map(value => {
      const match = value.trim().match(/^(\d+)\s*(.+)$/)
      const inputCoefficient = match ? Number(match[1]) : 1
      const formula = (match ? match[2] : value).trim()
      if (!Number.isSafeInteger(inputCoefficient) || inputCoefficient < 1) {
        throw new Error('Koeffitsiyent musbat butun son bo‘lishi kerak.')
      }
      return { formula, inputCoefficient, composition: parseFormula(formula) }
    })
  }

  return {
    original: input.trim(),
    reactants: parseSide(leftText, 'Reagentlar'),
    products: parseSide(rightText, 'Mahsulotlar'),
  }
}

function findNullspaceVector(matrix, columnCount) {
  const rows = matrix.map(row => row.map(value => rational(BigInt(value))))
  const pivotColumns = []
  let pivotRow = 0

  for (let column = 0; column < columnCount && pivotRow < rows.length; column++) {
    const selectedRow = rows.findIndex((row, index) => index >= pivotRow && row[column].n !== 0n)
    if (selectedRow === -1) continue
    ;[rows[pivotRow], rows[selectedRow]] = [rows[selectedRow], rows[pivotRow]]

    const pivot = rows[pivotRow][column]
    rows[pivotRow] = rows[pivotRow].map(value => divide(value, pivot))
    for (let row = 0; row < rows.length; row++) {
      if (row === pivotRow || rows[row][column].n === 0n) continue
      const factor = rows[row][column]
      rows[row] = rows[row].map((value, index) =>
        subtract(value, multiply(factor, rows[pivotRow][index])),
      )
    }
    pivotColumns.push(column)
    pivotRow++
  }

  const freeColumns = Array.from({ length: columnCount }, (_, index) => index)
    .filter(column => !pivotColumns.includes(column))
  if (freeColumns.length === 0) {
    throw new Error('Bu tenglama uchun faqat nol yechim mavjud; atomlarni saqlovchi balans topilmadi.')
  }
  if (freeColumns.length > 1) {
    throw new Error('Tenglama bir nechta mustaqil balansga ega (aniqlanmagan). Birikmalarni tekshiring yoki qo‘shimcha shart kiriting.')
  }

  const vector = Array.from({ length: columnCount }, () => rational(0n))
  vector[freeColumns[0]] = rational(1n)
  pivotColumns.forEach((column, row) => {
    vector[column] = rational(-rows[row][freeColumns[0]].n, rows[row][freeColumns[0]].d)
  })

  let denominatorLcm = 1n
  for (const value of vector) {
    denominatorLcm = (denominatorLcm / gcd(denominatorLcm, value.d)) * value.d
  }
  let integers = vector.map(value => value.n * (denominatorLcm / value.d))
  const divisor = integers.reduce((current, value) => gcd(current, value), 0n)
  integers = integers.map(value => value / divisor)

  if (integers.every(value => value < 0n)) integers = integers.map(value => -value)
  if (integers.some(value => value <= 0n)) {
    throw new Error('Bu tenglamada barcha birikmalar uchun musbat koeffitsiyentli balans mavjud emas.')
  }
  return integers
}

function countAtoms(side, coefficients) {
  return side.reduce((total, compound, index) => {
    Object.entries(compound.composition).forEach(([element, count]) => {
      total[element] = (total[element] || 0n) + BigInt(count) * coefficients[index]
    })
    return total
  }, {})
}

function formatSide(side, coefficients, offset = 0) {
  return side.map((compound, index) => {
    const coefficient = coefficients[offset + index]
    return `${coefficient === 1n ? '' : coefficient}${compound.formula}`
  }).join(' + ')
}

export function balanceEquation(input) {
  const equation = parseEquation(input)
  const compounds = [...equation.reactants, ...equation.products]
  const elements = [...new Set(compounds.flatMap(compound => Object.keys(compound.composition)))]
  const matrix = elements.map(element => compounds.map((compound, index) => {
    const atoms = compound.composition[element] || 0
    return index < equation.reactants.length ? atoms : -atoms
  }))

  const coefficients = findNullspaceVector(matrix, compounds.length)
  const reactantCoefficients = coefficients.slice(0, equation.reactants.length)
  const productCoefficients = coefficients.slice(equation.reactants.length)
  const reactantAtoms = countAtoms(equation.reactants, reactantCoefficients)
  const productAtoms = countAtoms(equation.products, productCoefficients)
  const atomCounts = elements.map(element => ({
    element,
    reactants: (reactantAtoms[element] || 0n).toString(),
    products: (productAtoms[element] || 0n).toString(),
    balanced: (reactantAtoms[element] || 0n) === (productAtoms[element] || 0n),
  }))

  if (atomCounts.some(count => !count.balanced)) {
    throw new Error('Ichki atom tekshiruvi muvaffaqiyatsiz tugadi. Balanslangan tenglama ko‘rsatilmaydi.')
  }

  const enteredReactantAtoms = countAtoms(
    equation.reactants,
    equation.reactants.map(compound => BigInt(compound.inputCoefficient)),
  )
  const enteredProductAtoms = countAtoms(
    equation.products,
    equation.products.map(compound => BigInt(compound.inputCoefficient)),
  )
  const alreadyBalanced = elements.every(element =>
    (enteredReactantAtoms[element] || 0n) === (enteredProductAtoms[element] || 0n),
  )
  const renderedCoefficients = coefficients.map(String)
  const balanced = `${formatSide(equation.reactants, coefficients)} → ${formatSide(equation.products, coefficients, equation.reactants.length)}`

  return {
    original: equation.original,
    balanced,
    coefficients: renderedCoefficients,
    atomCounts,
    alreadyBalanced,
    validation: atomCounts.every(count => count.balanced),
    note: 'Bu natija faqat atomlar saqlanish qonuni bo‘yicha matematik balansdir; reaksiya kimyoviy jihatdan sodir bo‘lishini tasdiqlamaydi.',
  }
}
