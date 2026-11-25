import { elements } from '../data/elements.js'

const masses = Object.fromEntries(elements.map(element => [element.symbol, element.mass]))

function addCount(composition, symbol, count) {
  const total = (composition[symbol] || 0) + count
  if (!Number.isSafeInteger(total)) throw new Error('Formuladagi atomlar soni juda katta.')
  composition[symbol] = total
}

export function parseFormula(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Kimyoviy formula kiriting.')
  }

  const formula = input.trim()
  let index = 0

  function parseNumber() {
    const start = index
    while (/\d/.test(formula[index] || '')) index++
    if (start === index) return 1
    const count = Number(formula.slice(start, index))
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new Error('Formula indekslari musbat butun son bo‘lishi kerak.')
    }
    return count
  }

  function parseGroup(expectedClose = null) {
    const composition = {}
    let hasTerm = false

    while (index < formula.length) {
      const character = formula[index]
      if (character === ')' || character === ']') {
        if (character !== expectedClose) {
          throw new Error('Qavslar juftligi yoki joylashuvi noto‘g‘ri.')
        }
        break
      }

      if (character === '(' || character === '[') {
        const close = character === '(' ? ')' : ']'
        index++
        const nested = parseGroup(close)
        if (formula[index] !== close) throw new Error('Qavs yopilmagan.')
        index++
        if (!Object.keys(nested).length) throw new Error('Bo‘sh qavs guruhi ishlatib bo‘lmaydi.')
        const multiplier = parseNumber()
        Object.entries(nested).forEach(([symbol, count]) => {
          addCount(composition, symbol, count * multiplier)
        })
        hasTerm = true
        continue
      }

      if (!/[A-Z]/.test(character)) {
        throw new Error(`Formula tuzilmasi noto‘g‘ri (${index + 1}-belgi).`)
      }
      let symbol = formula[index++]
      while (/[a-z]/.test(formula[index] || '')) symbol += formula[index++]
      if (!Object.hasOwn(masses, symbol)) throw new Error(`Noma’lum element belgisi: ${symbol}.`)
      addCount(composition, symbol, parseNumber())
      hasTerm = true
    }

    if (!hasTerm) throw new Error('Formula yoki qavs guruhi bo‘sh bo‘lishi mumkin emas.')
    return composition
  }

  const composition = parseGroup()
  if (index !== formula.length) throw new Error('Qavs yopilmagan yoki formula davomida ortiqcha belgi bor.')
  return composition
}

export function calculateFormula(formula) {
  const composition = parseFormula(formula)
  const molarMass = Object.entries(composition).reduce(
    (sum, [symbol, count]) => sum + masses[symbol] * count,
    0,
  )
  return { composition, molarMass }
}
