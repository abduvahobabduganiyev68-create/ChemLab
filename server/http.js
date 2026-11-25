import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { balanceEquation } from '../src/chemistry/balance.js'
import { getReactionCounts, getSyncValues } from './database.js'
import { checkAnswer, generateQuestionSet, newSessionId, TEST_QUESTION_COUNT } from './quiz.js'
import { syncRhea } from './sync.js'

const MAX_BODY_BYTES = 16 * 1024
const refreshAttempts = new Map()

function send(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(value))
}

async function readJson(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw Object.assign(new Error('So‘rov hajmi juda katta.'), { status: 413 })
  }
  try { return body ? JSON.parse(body) : {} }
  catch { throw Object.assign(new Error('So‘rov JSON formati noto‘g‘ri.'), { status: 400 }) }
}

function getSession(db, id) {
  const row = db.prepare('SELECT * FROM test_sessions WHERE id = ?').get(id)
  if (!row) return null
  return {
    ...row,
    questionIds: JSON.parse(row.question_ids_json),
    answers: JSON.parse(row.answers_json),
  }
}

function getQuestion(db, session, index) {
  const id = session.questionIds[index]
  if (!id) return null
  const reaction = db.prepare('SELECT id, question_equation, difficulty FROM reactions WHERE id = ?').get(id)
  if (!reaction) throw new Error('Test savoli ma’lumotlar bazasida topilmadi.')
  const equation = reaction.question_equation
  const answer = session.answers[String(index)]
  return {
    id,
    index,
    total: TEST_QUESTION_COUNT,
    equation,
    difficulty: reaction.difficulty,
    answered: Boolean(answer),
    correct: answer?.correct ?? null,
  }
}

export function createApiServer(db, {
  adminToken = process.env.CHEMLAB_ADMIN_TOKEN || '',
  sync = () => syncRhea(db),
  now = () => new Date(),
} = {}) {
  const api = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost')
    const parts = url.pathname.split('/').filter(Boolean)

    try {
      if (request.method === 'GET' && url.pathname === '/api/reactions/meta') {
        const syncState = getSyncValues(db)
        const total = db.prepare("SELECT COUNT(*) AS count FROM reactions WHERE validation_status = 'validated'").get().count
        return send(response, 200, {
          total,
          byDifficulty: getReactionCounts(db),
          lastSuccessfulUpdate: syncState.last_success_at || null,
          lastAttempt: syncState.last_attempt_at || null,
          lastError: syncState.last_error || null,
          lastImported: Number(syncState.last_imported_count || 0),
          lastSkipped: Number(syncState.last_skipped_count || 0),
          lastDuplicates: Number(syncState.last_duplicate_count || 0),
          formulaLookupFailures: Number(syncState.last_lookup_failures || 0),
          limitedFormulaLookups: Number(syncState.last_limited_chebi_count || 0),
          lastCheckedRows: Number(syncState.last_checked_rows || 0),
          sourceUrl: syncState.last_source_url || 'https://www.rhea-db.org/',
          manualRefreshEnabled: Boolean(adminToken),
          sourceNotice: 'Rhea ishtirokchi nomlarini ChEBI identifikatorlari orqali formula bilan bog‘laydi. Faqat zaryadsiz, qo‘llab-quvvatlanadigan formulalari to‘liq tekshirilgan reaksiyalar test bazasiga qo‘shiladi.',
        })
      }

      if (request.method === 'POST' && url.pathname === '/api/reactions/refresh') {
        if (!adminToken || !request.headers['x-admin-token']) return send(response, 403, { error: 'Qo‘lda yangilash uchun administrator ruxsati kerak.' })
        const provided = Buffer.from(String(request.headers['x-admin-token']))
        const expected = Buffer.from(adminToken)
        if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
          return send(response, 403, { error: 'Administrator tokeni noto‘g‘ri.' })
        }
        const requester = request.socket.remoteAddress || 'unknown'
        const timestamps = (refreshAttempts.get(requester) || []).filter(time => Date.now() - time < 60_000)
        if (timestamps.length >= 2) return send(response, 429, { error: 'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.' })
        refreshAttempts.set(requester, [...timestamps, Date.now()])
        return send(response, 200, await sync())
      }

      if (request.method === 'POST' && url.pathname === '/api/tests') {
        const body = await readJson(request)
        const difficulty = body.difficulty || 'all'
        if (!['all', 'easy', 'medium', 'hard'].includes(difficulty)) {
          return send(response, 400, { error: 'Qiyinlik darajasi noto‘g‘ri.' })
        }
        const reactions = db.prepare("SELECT * FROM reactions WHERE validation_status = 'validated'").all()
        let questions
        try {
          questions = generateQuestionSet(reactions, { difficulty, prioritizeIds: Array.isArray(body.retryIds) ? body.retryIds : [] })
        } catch (error) {
          return send(response, 409, { error: error.message })
        }
        const id = newSessionId()
        const startedAt = now().toISOString()
        db.prepare(`INSERT INTO test_sessions
          (id, difficulty, question_ids_json, answers_json, started_at, status)
          VALUES (?, ?, ?, '{}', ?, 'in_progress')`)
          .run(id, difficulty, JSON.stringify(questions.map(question => question.id)), startedAt)
        return send(response, 201, { sessionId: id, total: TEST_QUESTION_COUNT, startedAt, question: getQuestion(db, getSession(db, id), 0) })
      }

      if (parts[0] === 'api' && parts[1] === 'tests' && parts[2]) {
        const session = getSession(db, parts[2])
        if (!session) return send(response, 404, { error: 'Test sessiyasi topilmadi.' })

        if (request.method === 'GET' && parts[3] === 'question') {
          const index = Number(url.searchParams.get('index'))
          if (!Number.isInteger(index) || index < 0 || index >= TEST_QUESTION_COUNT) {
            return send(response, 400, { error: 'Savol raqami noto‘g‘ri.' })
          }
          return send(response, 200, getQuestion(db, session, index))
        }

        if (request.method === 'POST' && parts[3] === 'answer') {
          const body = await readJson(request)
          const index = Number(body.index)
          if (!Number.isInteger(index) || index < 0 || index >= TEST_QUESTION_COUNT) {
            return send(response, 400, { error: 'Savol raqami noto‘g‘ri.' })
          }
          const outcome = db.transaction(() => {
            const current = getSession(db, session.id)
            if (!current) return { status: 404, error: 'Test sessiyasi topilmadi.' }
            if (current.status !== 'in_progress') return { status: 409, error: 'Bu test allaqachon yakunlangan.' }
            if (current.answers[String(index)]) return { status: 409, error: 'Bu savolga javob allaqachon yuborilgan.' }
            const reaction = db.prepare('SELECT coefficients_json FROM reactions WHERE id = ?').get(current.questionIds[index])
            if (!reaction) return { status: 500, error: 'Test savoli ma’lumotlar bazasida topilmadi.' }
            const checked = checkAnswer(JSON.parse(reaction.coefficients_json), body.coefficients)
            if (!checked.valid) return { status: 400, error: checked.error }
            current.answers[String(index)] = {
              coefficients: body.coefficients.map(String),
              correct: checked.correct,
              answeredAt: now().toISOString(),
            }
            const completed = Object.keys(current.answers).length === TEST_QUESTION_COUNT
            db.prepare(`UPDATE test_sessions SET answers_json = ?, status = ?, completed_at = ?
              WHERE id = ?`)
              .run(JSON.stringify(current.answers), completed ? 'completed' : 'in_progress', completed ? now().toISOString() : null, current.id)
            return { status: 200, body: { correct: checked.correct, answered: true, completed } }
          })()
          return send(response, outcome.status, outcome.body || { error: outcome.error })
        }

        if (request.method === 'GET' && parts[3] === 'results') {
          if (session.status !== 'completed') return send(response, 409, { error: 'Barcha 20 savolga javob bergach natija ko‘rsatiladi.' })
          const detail = session.questionIds.map((id, index) => {
            const reaction = db.prepare('SELECT * FROM reactions WHERE id = ?').get(id)
            const balanced = balanceEquation(reaction.balanced_equation)
            const answer = session.answers[String(index)]
            return {
              index,
              equation: reaction.question_equation,
              balancedEquation: reaction.balanced_equation,
              userCoefficients: answer.coefficients,
              correctCoefficients: JSON.parse(reaction.coefficients_json),
              correct: answer.correct,
              atomCounts: balanced.atomCounts,
            }
          })
          const correct = detail.filter(item => item.correct).length
          const startedAt = Date.parse(session.started_at)
          const completedAt = Date.parse(session.completed_at)
          return send(response, 200, {
            total: TEST_QUESTION_COUNT,
            correct,
            incorrect: TEST_QUESTION_COUNT - correct,
            percentage: Math.round(correct / TEST_QUESTION_COUNT * 100),
            durationSeconds: Math.max(0, Math.round((completedAt - startedAt) / 1000)),
            difficulty: session.difficulty,
            questions: detail,
          })
        }
      }

      return send(response, 404, { error: 'API yo‘li topilmadi.' })
    } catch (error) {
      console.error(`[api] ${request.method} ${url.pathname}: ${error.message}`)
      return send(response, error.status || 500, { error: error.status ? error.message : 'Server xatosi yuz berdi.' })
    }
  })
  return api
}
