import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { proverbs, makeProverbPuzzle, isProverbAnswer, proverbCredit } from '../proverbData'
import { slangWords, isSlangAnswer, normalizeSlang } from '../slangData'
import { advanceChallenge, createChallenge, restoreChallenge } from '../challenge'
import { formatTime } from '../time'
import Panel from './Panel'
import Lives from './Lives'
import { PauseIcon, PlayIcon } from '@radix-ui/react-icons'
import { SlangCredit } from './AboutCredits'
import './challenge.css'

const titles = { slang: 'မြန်မာ Slang', 'proverb-choice': 'စကားပုံ · ရွေးဖြေ', 'proverb-input': 'စကားပုံ · ရိုက်ဖြေ' }
const reasons = { completed: 'အားလုံးပြီးဆုံးပါပြီ', lives: 'အသက် ၃ ခု ကုန်သွားပါပြီ', stopped: 'ပွဲအဆုံးသတ်ထားပါတယ်' }
const catalog = mode => mode === 'slang' ? slangWords.map(item => item.word) : proverbs.map(item => item.id)
const storageKey = mode => `assembly-challenge-v1:${mode}`
function save(run) { try { localStorage.setItem(storageKey(run.mode), JSON.stringify(run)) } catch { /* This session still works without storage. */ } }
function load(mode, userId) {
  try { return restoreChallenge(JSON.parse(localStorage.getItem(storageKey(mode))), mode, catalog(mode), userId) } catch { return null }
}

export default function MyanmarChallenge({ t, mode, userId, blocked, onExit, saveResult, cloudMessage, pendingCloud, retryCloud }) {
  const [run, dispatch] = useReducer((state, action) => action.type === 'restart' ? createChallenge(mode, catalog(mode), userId) : advanceChallenge(state, action), null,
    () => load(mode, userId) || createChallenge(mode, catalog(mode), userId))
  const [confirmStop, setConfirmStop] = useState(false)
  const [notice, setNotice] = useState('')
  const current = useRef(run)
  const clock = useRef(null)
  const composing = useRef(false)
  const active = run.phase === 'question' && !blocked && !confirmStop
  const send = useCallback(action => {
    const now = performance.now()
    const delta = clock.current == null ? 0 : now - clock.current
    if (clock.current != null) clock.current = now
    dispatch({ ...action, delta })
  }, [])
  useEffect(() => { current.current = run; save(run) }, [run])
  useEffect(() => () => {
    const delta = clock.current == null ? 0 : performance.now() - clock.current
    save(advanceChallenge(current.current, { type: 'pause', delta }))
  }, [])
  useEffect(() => {
    if (!active || document.hidden) return
    clock.current = performance.now()
    const interval = setInterval(() => send({ type: 'tick' }), 250)
    return () => {
      clearInterval(interval)
      const delta = clock.current == null ? 0 : performance.now() - clock.current
      clock.current = null
      dispatch({ type: 'tick', delta })
    }
  }, [active, send])
  useEffect(() => {
    const pause = event => {
      if (document.hidden || event.type === 'pagehide') {
        const delta = clock.current == null ? 0 : performance.now() - clock.current
        save(advanceChallenge(current.current, { type: 'pause', delta }))
        send({ type: 'pause' })
      }
    }
    document.addEventListener('visibilitychange', pause)
    window.addEventListener('pagehide', pause)
    return () => { document.removeEventListener('visibilitychange', pause); window.removeEventListener('pagehide', pause) }
  }, [send])
  useEffect(() => {
    if (blocked) send({ type: 'pause' })
  }, [blocked, send])
  useEffect(() => {
    if (run.phase === 'finished' || run.phase === 'paused') saveResult({ id: run.id, userId: run.userId, mode, correct: run.correct, incorrect: run.incorrect,
      skipped: run.skipped, total: run.deck.length, elapsedMs: Math.max(1, run.elapsedMs), reason: run.phase === 'paused' ? 'paused' : run.reason })
  }, [run, mode, saveResult])
  const puzzle = useMemo(() => {
    const id = run.deck[run.index]
    return mode === 'slang' ? slangWords.find(item => item.word === id) : makeProverbPuzzle(proverbs.find(item => item.id === id))
  }, [mode, run.deck, run.index])
  const answered = run.correct + run.incorrect + run.skipped
  const reading = run.phase === 'reading'
  const finished = run.phase === 'finished'
  const answer = useCallback((value) => {
    if (!active || composing.current) return
    if (!normalizeSlang(value)) { setNotice('အဖြေကို မြန်မာလို ရိုက်ထည့်ပါ။'); return }
    const correct = mode === 'slang' ? isSlangAnswer(puzzle, value) : isProverbAnswer(puzzle, value)
    send({ type: 'answer', kind: correct ? 'correct' : 'incorrect' }); setNotice('')
  }, [active, mode, puzzle, send])
  useEffect(() => {
    function onKey(event) {
      if (blocked || confirmStop || event.repeat || event.isComposing || composing.current || event.ctrlKey || event.altKey || event.metaKey) return
      if (event.target.isContentEditable || event.target.closest?.('input, textarea, select, [role=dialog], .header-account-menu')) return
      if (active && mode === 'proverb-choice' && /^[1-9]$/.test(event.key)) {
        const option = puzzle.options[Number(event.key) - 1]
        if (option) { event.preventDefault(); answer(option) }
      } else if (event.key.toLowerCase() === 'p' && (active || run.phase === 'paused')) {
        event.preventDefault(); send({ type: active ? 'pause' : 'resume' })
      } else if (event.key === 'Enter' && reading && event.target.tagName !== 'BUTTON' && event.target.tagName !== 'A') {
        event.preventDefault(); send({ type: 'next' }); setNotice(''); window.scrollTo(0, 0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [blocked, confirmStop, active, mode, puzzle, answer, run.phase, reading, send])
  function next() { send({ type: 'next' }); setNotice(''); window.scrollTo(0, 0) }
  function stopPrompt() { send({ type: 'pause' }); setConfirmStop(true) }
  return <section className={`challenge-page${finished || reading ? ' challenge-answer' : ''}`} aria-label={`${titles[mode]} ပွဲရှည်`}>
    <div className="challenge-heading"><h1>{titles[mode]}</h1><span className="round-timer" aria-label="စုစုပေါင်းဖြေချိန်">{formatTime(run.elapsedMs)}</span></div>
    {!finished && <div className="challenge-session-controls">{run.phase === 'question' ? <button className="challenge-pause-button" onClick={() => send({ type: 'pause' })}><PauseIcon width={20} height={20} aria-hidden="true" />{t("Pause","Pause · ခဏနားမယ်")}</button> : run.phase === 'paused' ? <button className="challenge-pause-button" onClick={() => send({ type: 'resume' })}><PlayIcon width={20} height={20} aria-hidden="true" />{t("Resume","Resume · ပြန်ဆက်မယ်")}</button> : <p>အဖြေဖတ်နေချိန် — Timer ရပ်ထားပါတယ်။</p>}</div>}
    {!finished && <p className="play-controls-help">{reading ? 'Enter · နောက်မေးခွန်း / Tap Next' : mode === 'proverb-choice' ? '1–4 · ရွေးဖြေပါ / Tap an answer · P · Pause / Resume' : 'မြန်မာ keyboard နဲ့ ရိုက်ပါ · Enter / စစ်မယ် · P · Pause / Resume'}</p>}
    <div className="challenge-progress"><span>{t("Completed", "ပြီးစီး")} {answered} / {run.deck.length}</span><strong>{t("Correct", "ဖြေမှန်")} {run.correct}</strong><span aria-label={`အသက် ${run.lives} ခုကျန်`}>{t("Lives", "အသက်")} {run.lives} / 3</span></div>
    <progress max={run.deck.length} value={answered} aria-label="ပွဲတိုးတက်မှု" />
    <Lives remaining={run.lives} total={3} label={`အသက် ${run.lives} ခုကျန်`} />
    {finished ? <>
      <h2 role="status">{reasons[run.reason]}</h2>
      <div className="challenge-summary"><div><strong>{run.correct}</strong><span>{t("Correct","ဖြေမှန်")}</span></div><div><strong>{run.incorrect}</strong><span>{t("Incorrect","ဖြေမှား")}</span></div><div><strong>{run.skipped}</strong><span>{t("Skipped","ကျော်ထား")}</span></div><div><strong>{formatTime(run.elapsedMs)}</strong><span>စုစုပေါင်းဖြေချိန်</span></div></div>
      <p>ပြီးစီး {answered} / {run.deck.length} · ကျန် {run.deck.length - answered} ခု</p>
      {run.lastAnswer && <div className="challenge-explanation"><h2>နောက်ဆုံးမေးခွန်းအဖြေ</h2><strong>{puzzle.word}</strong><p>{puzzle.meaning}</p></div>}
      <p role="status">{run.userId ? cloudMessage : 'Leaderboard မှာ သိမ်းရန် ပွဲမစမီ account ဝင်ထားပါ။'}</p>
      {pendingCloud && <button onClick={retryCloud}>ပြန်သိမ်းမယ်</button>}
      <div className="challenge-actions"><button onClick={onExit}>{t("Choose game","Game ရွေးမယ်")}</button><button className="next-game" onClick={() => { dispatch({ type: 'restart' }); window.scrollTo(0, 0) }}>{t("New game →","ပွဲအသစ် စမယ် →")}</button></div>
    </> : run.phase === 'paused' ? <div className="challenge-pause"><h2>{t("Game paused","ခဏနားထားပါတယ်")}</h2><p>ခဏနားချိန်ကို ဖြေချိန်ထဲ မတွက်ပါ။ ဒီ browser မှာ နောက်မှ ပြန်ဆက်နိုင်ပါတယ်။</p><button className="next-game" onClick={() => send({ type: 'resume' })}>{t("Resume →","ပြန်ဆက်မယ် →")}</button><button onClick={stopPrompt}>{t("End game","ပွဲအဆုံးသတ်မယ်")}</button><button className="text-button" onClick={onExit}>{t("Choose game","Game ရွေးမယ်")}</button><p role="status">{run.userId ? cloudMessage : 'Leaderboard မှာ သိမ်းရန် ပွဲမစမီ account ဝင်ထားပါ။'}</p>{pendingCloud && <button onClick={retryCloud}>ပြန်သိမ်းမယ်</button>}</div> : reading ? <>
      <p className={run.lastAnswer === 'correct' ? 'challenge-correct' : ''} role="status">{run.lastAnswer === 'correct' ? 'မှန်ပါတယ်!' : run.lastAnswer === 'skipped' ? 'ကျော်ထားပါတယ် · အသက် ၁ ခု လျော့သွားပါတယ်။' : 'မမှန်ပါ · အသက် ၁ ခု လျော့သွားပါတယ်။'}</p>
      <div className="challenge-explanation"><strong>{puzzle.word}</strong><h2>{t("Meaning","အဓိပ္ပာယ်")}</h2><p>{puzzle.meaning}</p></div>
      <p className="challenge-note">အဖြေနဲ့ အဓိပ္ပာယ်ဖတ်နေချိန်ကို timer ထဲ မတွက်ပါ။</p>
      <div className="challenge-actions"><button onClick={stopPrompt}>{t("End game","ပွဲအဆုံးသတ်မယ်")}</button><button className="next-game" onClick={next}>{t("Next question →","နောက်မေးခွန်း →")}</button></div>
    </> : <>
      <div className="challenge-puzzle"><span>{t("Question", "မေးခွန်း")} {run.index + 1}</span>{mode === 'slang' ? <p>{puzzle.clue}</p> : <p>{puzzle.prefix} <span className="proverb-blank">______</span>{puzzle.trailing ? " " + puzzle.trailing : ""}</p>}{run.hintUsed && <p className="challenge-hint">အစ — {puzzle.hint}…</p>}</div>
      {mode === 'proverb-choice' ? <div className="proverb-options" role="group" aria-label="Choose an answer">{puzzle.options.map((option, index) => <button key={option} aria-keyshortcuts={String(index + 1)} onClick={() => answer(option)}><kbd className="answer-key">{index + 1}</kbd> {option}</button>)}</div> : <form className="slang-form" onSubmit={event => { event.preventDefault(); answer(run.draft) }}><label htmlFor="challenge-answer">{t("Your answer","သင့်အဖြေ")}</label><div><input id="challenge-answer" value={run.draft} onChange={event => send({ type: 'draft', value: event.target.value })} onCompositionStart={() => { composing.current = true }} onCompositionEnd={() => { composing.current = false }} onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || composing.current || event.keyCode === 229)) event.preventDefault() }} lang="my" enterKeyHint="done" autoComplete="off" maxLength={500} placeholder="မြန်မာလို ရိုက်ပါ…" /><button className="next-game" disabled={!run.draft.trim()}>{t("Check","စစ်မယ်")}</button></div></form>}
      <p role="status">{notice}</p>
      <div className="challenge-tools"><button disabled={run.hintUsed} onClick={() => send({ type: 'hint' })}>အစ ဖော်မယ်</button><button onClick={() => send({ type: 'answer', kind: 'skipped' })}>ကျော်မယ် (−1 အသက်)</button><button onClick={stopPrompt}>{t("End game","ပွဲအဆုံးသတ်မယ်")}</button></div>
    </>}
    {mode === 'slang' ? <SlangCredit /> : <p className="proverb-credit">{proverbCredit}</p>}
    {confirmStop && <Panel className="confirm" title="ပွဲအဆုံးသတ်မလား?" onClose={() => setConfirmStop(false)}><p>လက်ရှိဖြေမှန်အရေအတွက်နဲ့ ဖြေချိန်ကို သိမ်းပြီး ပွဲအဆုံးသတ်ပါမယ်။ ဒီပွဲကို ပြန်ဆက်လို့ မရတော့ပါ။</p><button onClick={() => setConfirmStop(false)}>ခဏနားထားမယ်</button><button className="next-game" onClick={() => { send({ type: 'stop' }); setConfirmStop(false) }}>အဆုံးသတ်ပြီး သိမ်းမယ်</button></Panel>}
  </section>
}
