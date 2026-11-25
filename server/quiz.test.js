import test from 'node:test'
import assert from 'node:assert/strict'
import { checkAnswer, generateQuestionSet, TEST_QUESTION_COUNT } from './quiz.js'

const makePool = (size = 25) => Array.from({ length: size }, (_, index) => ({
  id: `r-${index}`,
  difficulty: index < 21 ? 'easy' : 'hard',
  validation_status: 'validated',
}))

test('creates exactly 20 unique questions in randomized order', () => {
  const questions = generateQuestionSet(makePool(), { random: () => 0.25 })
  assert.equal(questions.length, TEST_QUESTION_COUNT)
  assert.equal(new Set(questions.map(question => question.id)).size, TEST_QUESTION_COUNT)
  assert.notDeepEqual(questions.map(question => question.id), makePool().slice(0, 20).map(question => question.id))
})

test('honors difficulty filtering and prioritizes incorrect questions on retry', () => {
  const pool = makePool(30)
  const easy = generateQuestionSet(pool, { difficulty: 'easy', random: () => 0, prioritizeIds: ['r-4', 'r-2'] })
  assert.equal(easy.length, 20)
  assert.ok(easy.every(question => question.difficulty === 'easy'))
  assert.deepEqual(easy.slice(0, 2).map(question => question.id), ['r-2', 'r-4'])
  assert.throws(() => generateQuestionSet(pool, { difficulty: 'hard' }), /tasdiqlangan reaksiya mavjud/)
})

test('fails rather than duplicating when fewer than 20 valid reactions exist', () => {
  assert.throws(() => generateQuestionSet(makePool(19)), /19 ta tasdiqlangan/)
})

test('checks correct and incorrect coefficient vectors without accepting malformed input', () => {
  assert.deepEqual(checkAnswer(['2', '1', '2'], ['2', '1', '2']), { valid: true, correct: true })
  assert.deepEqual(checkAnswer(['2', '1', '2'], ['1', '1', '1']), { valid: true, correct: false })
  assert.equal(checkAnswer(['2', '1'], ['2']).valid, false)
  assert.equal(checkAnswer(['2', '1'], ['0', '1']).valid, false)
})
