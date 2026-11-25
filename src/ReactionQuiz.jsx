import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, ShieldCheck } from 'lucide-react'
import { parseEquation } from './chemistry/balance.js'
import './ReactionQuiz.css'

const request = async (url, options) => {
  const response = await fetch(url, options)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Server bilan bog‘lanib bo‘lmadi.')
  return body
}

function PageTitle({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

export default function ReactionQuiz() {
  const [meta, setMeta] = useState(null)
  const [metaError, setMetaError] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const [session, setSession] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [question, setQuestion] = useState(null)
  const [coefficients, setCoefficients] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [review, setReview] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)

  const refreshMeta = async () => {
    try { setMeta(await request('/api/reactions/meta')); setMetaError('') }
    catch (err) { setMetaError(err.message) }
  }
  useEffect(() => {
    let active = true
    request('/api/reactions/meta')
      .then(data => { if (active) { setMeta(data); setMetaError('') } })
      .catch(err => { if (active) setMetaError(err.message) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!session || results) return
    let active = true
    request(`/api/tests/${session.sessionId}/question?index=${questionIndex}`)
      .then(data => {
        if (!active) return
        setQuestion(data)
        const parsed = parseEquation(data.equation)
        setCoefficients(Array(parsed.reactants.length + parsed.products.length).fill(''))
        setFeedback(data.answered ? { correct: data.correct, already: true } : null)
        setError('')
      })
      .catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [session, questionIndex, results])

  const formulaParts = useMemo(() => {
    if (!question) return []
    try {
      const parsed = parseEquation(question.equation)
      return [...parsed.reactants, ...parsed.products].map(compound => compound.formula)
    } catch { return [] }
  }, [question])

  const startTest = async (retryIds = [], selectedDifficulty = difficulty) => {
    setBusy(true); setError('')
    try {
      const started = await request('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty: selectedDifficulty, retryIds }),
      })
      setSession(started)
      setQuestionIndex(0)
      setQuestion(started.question)
      setCoefficients(Array(parseEquation(started.question.equation).reactants.length + parseEquation(started.question.equation).products.length).fill(''))
      setFeedback(null); setResults(null); setReview(false)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const submitAnswer = async event => {
    event.preventDefault()
    if (!session || !question || busy || feedback) return
    setBusy(true); setError('')
    try {
      const checked = await request(`/api/tests/${session.sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: questionIndex, coefficients }),
      })
      setFeedback({ correct: checked.correct })
      if (checked.completed) {
        const final = await request(`/api/tests/${session.sessionId}/results`)
        setResults(final)
      }
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const refreshDatabase = async () => {
    setBusy(true); setError('')
    try {
      await request('/api/reactions/refresh', {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken },
      })
      setAdminToken('')
      await refreshMeta()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const formatDate = value => value ? new Date(value).toLocaleString('uz-UZ') : 'Hali yangilanmagan'

  if (results) {
    const incorrect = results.questions.filter(item => !item.correct)
    const selectedReview = incorrect[reviewIndex]
    return <>
      <PageTitle eyebrow="TEST NATIJASI" title="Test yakunlandi" description="Natijalar matematik koeffitsiyentlar tekshiruvi asosida hisoblandi."/>
      <section className="reaction-quiz-results">
        <div className="quiz-score"><strong>{results.correct}<small> / {results.total}</small></strong><span>{results.percentage}% to‘g‘ri</span></div>
        <div className="quiz-stats"><div><span>To‘g‘ri javob</span><strong>{results.correct}</strong></div><div><span>Noto‘g‘ri javob</span><strong>{results.incorrect}</strong></div><div><span>Sarflangan vaqt</span><strong>{Math.floor(results.durationSeconds / 60)} daq {results.durationSeconds % 60} son</strong></div></div>
        <h2>{results.percentage >= 85 ? 'A’lo natija!' : results.percentage >= 60 ? 'Yaxshi natija' : 'Yana mashq qiling'}</h2>
        <div className="quiz-result-actions">
          <button className="primary" onClick={() => startTest()}>Yangi test</button>
          {incorrect.length > 0 && <button className="clear-reaction" onClick={() => {setReview(true);setReviewIndex(0)}}>Xatolarni ko‘rib chiqish ({incorrect.length})</button>}
          {incorrect.length > 0 && <button className="clear-reaction" onClick={() => {setDifficulty(results.difficulty);void startTest(incorrect.map(item => item.id), results.difficulty)}}>Xato savollarni qayta testga qo‘shish</button>}
        </div>
        {review && selectedReview && <div className="quiz-review">
          <div className="quiz-review-heading"><strong>Xato savol {reviewIndex + 1} / {incorrect.length}</strong><button className="clear-reaction" onClick={() => setReview(false)}>Yopish</button></div>
          <p><b>Tenglama:</b> <code>{selectedReview.equation}</code></p>
          <p><b>Sizning javobingiz:</b> {selectedReview.userCoefficients.join(', ')}</p>
          <p><b>To‘g‘ri koeffitsiyentlar:</b> {selectedReview.correctCoefficients.join(', ')}</p>
          <p><b>Balans:</b> <code>{selectedReview.balancedEquation}</code></p>
          <AtomTable rows={selectedReview.atomCounts}/>
          <div className="quiz-review-actions">
            <button className="clear-reaction" disabled={reviewIndex===0} onClick={()=>setReviewIndex(i=>i-1)}><ChevronLeft size={16}/> Oldingi xato</button>
            <button className="clear-reaction" disabled={reviewIndex===incorrect.length-1} onClick={()=>setReviewIndex(i=>i+1)}>Keyingi xato <ChevronRight size={16}/></button>
          </div>
        </div>}
      </section>
    </>
  }

  if (session) {
    return <>
      <PageTitle eyebrow="REAKSIYA TESTI" title="Tenglamani balanslang" description="Har bir reagent va mahsulot uchun eng kichik butun koeffitsiyentni kiriting."/>
      <section className="reaction-quiz-card">
        <div className="quiz-progress"><span>Savol {questionIndex + 1} / 20</span><div><i style={{width:`${((questionIndex + 1) / 20) * 100}%`}}/></div></div>
        {question&&<><span className="tag">{question.difficulty === 'easy' ? 'Oson' : question.difficulty === 'medium' ? 'O‘rta' : 'Murakkab'}</span>
          <div className="quiz-equation">{question.equation.replace('->','→').split(/(→|\+)/).map((token,index)=>token==='+'||token==='→'?<span key={index} className="equation-operator">{token}</span>:<span key={index}>{token}</span>)}</div>
          <p className="quiz-coefficient-hint">Koeffitsiyentlarni tenglamadagi tartibda kiriting: reagentlar, so‘ng mahsulotlar.</p>
          <form onSubmit={submitAnswer}>
            <div className="coefficient-fields">{formulaParts.map((formula,index)=><label key={`${formula}-${index}`}><span>{formula}</span><input aria-label={`${formula} koeffitsiyenti ${index+1}`} inputMode="numeric" pattern="[1-9][0-9]*" value={coefficients[index]||''} onChange={event=>setCoefficients(current=>current.map((value,i)=>i===index?event.target.value:value))} disabled={Boolean(feedback)} placeholder="?"/></label>)}</div>
            {feedback&&<div className={`quiz-answer-feedback ${feedback.correct?'correct':'incorrect'}`} role="status">{feedback.correct?'To‘g‘ri!':'Bu javob noto‘g‘ri.'} {feedback.already?' Javob avval yuborilgan.':' To‘g‘ri tenglama test yakunida ko‘rsatiladi.'}</div>}
            <div className="quiz-navigation">
              <button type="button" className="clear-reaction" disabled={questionIndex===0||busy} onClick={()=>setQuestionIndex(index=>index-1)}><ChevronLeft size={16}/> Oldingi</button>
              {!feedback&&<button type="submit" className="primary" disabled={busy||coefficients.some(value=>!value)}>{busy?'Tekshirilmoqda…':'Javobni tekshirish'}</button>}
              {feedback&&questionIndex<19&&<button type="button" className="primary" disabled={busy} onClick={()=>setQuestionIndex(index=>index+1)}>Keyingi <ChevronRight size={16}/></button>}
            </div>
          </form>
        </>}
        {error&&<p className="error-box" role="alert">{error}</p>}
      </section>
    </>
  }

  return <>
    <PageTitle eyebrow="REAKSIYA BILIM SINOVI" title="Kimyo bilimini sinang" description="Testda 20 ta takrorlanmaydigan tenglama bo‘ladi. Savollar tenglamalar bazasidan tasodifiy tanlanadi."/>
    <section className="reaction-quiz-card quiz-setup">
      {meta&&<div className="reaction-catalog-status"><div><ShieldCheck size={19}/><span><b>{meta.total}</b> tasdiqlangan reaksiya</span></div><div><span>Oxirgi muvaffaqiyatli tekshiruv</span><b>{formatDate(meta.lastSuccessfulUpdate)}</b><small>{meta.lastImported} yangi qo‘shildi · {meta.lastSkipped} mos kelmagan · {meta.lastDuplicates} takroriy yozuv</small>{(meta.formulaLookupFailures>0||meta.limitedFormulaLookups>0)&&<small>{meta.formulaLookupFailures} formula qidiruvi xatolandi · {meta.limitedFormulaLookups} identifikator sinxronlash chegarasi sabab keyinga qoldirildi</small>}</div></div>}
      {meta&&<div className="reaction-levels">{[['all','Aralash',meta.total],['easy','Oson',meta.byDifficulty.easy],['medium','O‘rta',meta.byDifficulty.medium],['hard','Murakkab',meta.byDifficulty.hard]].map(([value,label,count])=><button type="button" key={value} className={difficulty===value?'selected':''} disabled={count<20} onClick={()=>setDifficulty(value)}><strong>{label}</strong><span>{count} savol bankda</span>{count<20&&<small>20 ta kerak</small>}</button>)}</div>}
      {metaError&&<div className="error-box" role="alert">{metaError} API serverini ishga tushiring; offline test ma’lumotlari server SQLite bazasida saqlanadi.</div>}
      {error&&<div className="error-box" role="alert">{error}</div>}
      <button className="primary start-reaction-test" disabled={busy||!meta||meta.total<20} onClick={()=>void startTest()}>{busy?'Tayyorlanmoqda…':'20 savolli testni boshlash'}</button>
      <p className="chemistry-limitation">Test faqat atomlar saqlanish qonuni bo‘yicha balanslashni baholaydi; bu tenglamalar kimyoviy jihatdan sodir bo‘lishini anglatmaydi.</p>
      {meta?.lastError&&<p className="sync-error">Oxirgi Rhea yangilanishi xatosi: {meta.lastError}. Mahalliy baza ishlashda davom etadi.</p>}
      {meta?.manualRefreshEnabled&&<div className="admin-refresh"><label>Admin token<input type="password" autoComplete="off" value={adminToken} onChange={event=>setAdminToken(event.target.value)} placeholder="Faqat administrator uchun"/></label><button className="clear-reaction" disabled={!adminToken||busy} onClick={()=>void refreshDatabase()}><RefreshCw size={15}/> Bazani yangilash</button></div>}
      {meta&&<p className="rhea-source-note">{meta.sourceNotice} <a href={meta.sourceUrl} target="_blank" rel="noreferrer">Rhea manbasini ko‘rish</a></p>}
    </section>
  </>
}

function AtomTable({ rows }) {
  return <div className="atom-table-wrap"><table className="atom-table"><thead><tr><th>Element</th><th>Reagentlar</th><th>Mahsulotlar</th></tr></thead><tbody>{rows.map(row=><tr key={row.element}><th>{row.element}</th><td>{row.reactants}</td><td>{row.products}</td></tr>)}</tbody></table></div>
}
