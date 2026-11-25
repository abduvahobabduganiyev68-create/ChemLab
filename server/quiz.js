import { randomUUID } from 'node:crypto'

export const TEST_QUESTION_COUNT = 20

export function generateQuestionSet(reactions, {
  difficulty = 'all',
  random = Math.random,
  count = TEST_QUESTION_COUNT,
  prioritizeIds = [],
} = {}) {
  const eligible = reactions.filter(reaction =>
    reaction.validation_status === 'validated' &&
    (difficulty === 'all' || reaction.difficulty === difficulty),
  )
  const unique = [...new Map(eligible.map(reaction => [reaction.id, reaction])).values()]
  if (unique.length < count) {
    throw new Error(`Bu darajada ${unique.length} ta tasdiqlangan reaksiya mavjud. Test uchun ${count} ta noyob savol kerak.`)
  }

  const prioritySet = new Set(prioritizeIds)
  const prioritized = unique.filter(reaction => prioritySet.has(reaction.id))
  const remaining = unique.filter(reaction => !prioritySet.has(reaction.id))
  for (let index = remaining.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[remaining[index], remaining[swapIndex]] = [remaining[swapIndex], remaining[index]]
  }
  const chosen = [...prioritized, ...remaining].slice(0, count)
  if (chosen.length !== count || new Set(chosen.map(reaction => reaction.id)).size !== count) {
    throw new Error('Test uchun 20 ta noyob savolni tayyorlab bo‘lmadi.')
  }
  return chosen
}

export function checkAnswer(expectedCoefficients, submitted) {
  if (!Array.isArray(submitted) || submitted.length !== expectedCoefficients.length) {
    return { valid: false, correct: false, error: 'Har bir birikma uchun musbat butun koeffitsiyent kiriting.' }
  }
  const values = submitted.map(String)
  if (values.some(value => !/^[1-9]\d*$/.test(value) || value.length > 30)) {
    return { valid: false, correct: false, error: 'Koeffitsiyentlar musbat butun son bo‘lishi kerak.' }
  }
  const isCorrect = values.every((value, index) => value === String(expectedCoefficients[index]))
  return { valid: true, correct: isCorrect }
}

export function newSessionId() {
  return randomUUID()
}
