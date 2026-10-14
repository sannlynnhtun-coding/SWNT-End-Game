import { useCallback, useEffect, useRef, useState } from 'react'
import { languages } from './languages'
import { categories, difficulties, drawPuzzle } from './gameData'
import { drawSlang, isSlangAnswer, normalizeSlang } from './slangData'
import { drawProverb, isProverbAnswer, proverbCount } from './proverbData'
import Panel from './components/Panel'
import Feedback from './components/Feedback'
import Account, { Leaderboard } from './components/Online'
import useGameAccount from './useGameAccount'
import ReactConfetti from 'react-confetti'

function readStored(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch { return {} }
}
function readStats() {
  const stored = readStored('assembly-stats-v2')
  if (!stored.normal) stored.normal = readStored('assembly-stats')
  return Object.fromEntries([...difficulties, { id: 'slang' }, { id: 'proverb-choice' }, { id: 'proverb-input' }].map(({ id }) => {
    const record = stored[id] || {}
    const count = field => Number.isSafeInteger(record[field]) && record[field] >= 0 ? record[field] : 0
    return [id, { streak: count('streak'), best: count('best'), wins: count('wins') }]
  }))
}
export default function AssemblyEndgame() {
  const [googleSetup, setGoogleSetup] = useState(false)
  const [panel, setPanel] = useState(null)
  const { session, startOnlineRound, saveOnlineResult, cloudMessage, retryCloud, pendingCloud } = useGameAccount()
  useEffect(() => {
    const url = new URL(window.location.href)
    if (session && url.searchParams.get('login') === 'google') {
      setGoogleSetup(true); setPanel('account')
      url.searchParams.delete('login')
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }
  }, [session])

  const [mode, setMode] = useState('english')
  const isSlang = mode === 'slang'
  const isProverb = mode === 'proverb'
  const isMyanmar = isSlang || isProverb
  const [proverbPlay, setProverbPlay] = useState('choice')
  const [answer, setAnswer] = useState('')
  const [wrongAnswers, setWrongAnswers] = useState([])
  const [slangSolved, setSlangSolved] = useState(false)
  const composing = useRef(false)
  const answerInput = useRef(null)
  const [category, setCategory] = useState('daily')
  const [difficulty, setDifficulty] = useState('normal')
  const [round, setRound] = useState(() => drawPuzzle('daily', 'normal', readStored('assembly-word-history-v1')))
  const { puzzle, history } = round
  const [guessed, setGuessed] = useState([])
  const [clueShown, setClueShown] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [sound, setSound] = useState(false)
  const [stats, setStats] = useState(readStats)
  const [pendingSettings, setPendingSettings] = useState(null)
  const [message, setMessage] = useState('စာလုံးတစ်လုံး ရွေးပြီး စတင်လိုက်ပါ။')
  const scored = useRef(false)
  const audio = useRef(null)
  const wrong = isMyanmar ? wrongAnswers.length : guessed.filter(letter => !puzzle.word.includes(letter)).length
  const won = isMyanmar ? slangSolved : [...puzzle.word].every(letter => guessed.includes(letter))
  const lost = wrong >= 8
  const over = won || lost
  const activeCategory = categories.find(item => item.id === category)
  const activeDifficulty = difficulties.find(item => item.id === difficulty)
  const statsKey = isProverb ? `proverb-${proverbPlay}` : isSlang ? 'slang' : difficulty
  const record = stats[statsKey]

  useEffect(() => {
    function resize() {
      const height = window.visualViewport?.height || window.innerHeight
      document.documentElement.style.setProperty('--game-height', `${height}px`)
      document.documentElement.dataset.keyboard = height < window.innerHeight * .75 ? 'open' : 'closed'
    }
    resize()
    window.visualViewport?.addEventListener('resize', resize)
    window.addEventListener('resize', resize)
    return () => {
      window.visualViewport?.removeEventListener('resize', resize)
      window.removeEventListener('resize', resize)
      document.documentElement.style.removeProperty('--game-height')
      delete document.documentElement.dataset.keyboard
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('assembly-word-history-v1', JSON.stringify(history)) } catch { /* In-memory word cycles still work. */ }
  }, [history])

  useEffect(() => {
    try { localStorage.setItem('assembly-stats-v2', JSON.stringify(stats)) } catch { /* Play remains available without storage. */ }
  }, [stats])

  const playTone = useCallback((correct) => {
    if (!sound) return
    try {
      audio.current ||= new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audio.current
      void ctx.resume()
      const oscillator = ctx.createOscillator(), gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(correct ? 660 : 180, ctx.currentTime)
      gain.gain.setValueAtTime(0.055, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      oscillator.connect(gain); gain.connect(ctx.destination)
      oscillator.start(); oscillator.stop(ctx.currentTime + 0.15)
    } catch { /* Sound is optional when browser audio is unavailable. */ }
  }, [sound])

  const guess = useCallback((letter) => {
    if (isMyanmar || over || pendingSettings || panel || guessed.includes(letter)) return
    const correct = puzzle.word.includes(letter)
    setGuessed(previous => [...previous, letter])
    setMessage(correct ? `${letter.toUpperCase()} ပါတယ်။ ကယ်တင်ဖို့ နီးလာပြီ!` : `${letter.toUpperCase()} မပါဘူး။ ${languages[wrong].name} ထွက်သွားပြီ… ဆက်ကြိုးစားမယ်!`)
    playTone(correct)
  }, [isMyanmar, over, pendingSettings, panel, guessed, puzzle.word, wrong, playTone])

  useEffect(() => {
    function onKey(event) {
      if (panel) return
      if (pendingSettings) return
      if (isMyanmar || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return
      if (/^[a-z]$/i.test(event.key)) { event.preventDefault(); guess(event.key.toLowerCase()) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [guess, pendingSettings, isMyanmar, panel])

  useEffect(() => {
    if (!over || scored.current) return
    scored.current = true
    saveOnlineResult(statsKey, won)
    const current = stats[statsKey]
    const streak = won ? current.streak + 1 : 0
    setStats({ ...stats, [statsKey]: { streak, best: Math.max(current.best, streak), wins: current.wins + (won ? 1 : 0) } })
  }, [over, won, stats, statsKey, saveOnlineResult])

  function newGame(nextCategory = category, nextDifficulty = difficulty, nextMode = mode, nextPlay = proverbPlay, onlinePlayerId) {
    const nextStatsKey = nextMode === 'proverb' ? `proverb-${nextPlay}` : nextMode === 'slang' ? 'slang' : nextDifficulty
    if (nextStatsKey !== statsKey) {
      setStats(previous => ({ ...previous, [nextStatsKey]: { ...previous[nextStatsKey], streak: 0 } }))
    }
    startOnlineRound(onlinePlayerId); setPanel(null); setGoogleSetup(false)
    setCategory(nextCategory); setDifficulty(nextDifficulty); setMode(nextMode); setProverbPlay(nextPlay)
    setRound(nextMode === 'proverb' ? drawProverb(history, puzzle.word) : nextMode === 'slang' ? drawSlang(history, puzzle.word) : drawPuzzle(nextCategory, nextDifficulty, history, puzzle.word))
    setGuessed([]); setAnswer(''); setWrongAnswers([]); setSlangSolved(false); composing.current = false
    setClueShown(nextMode === 'proverb' || nextMode === 'slang' || nextDifficulty === 'easy'); setHintUsed(false); setPendingSettings(null)
    setMessage(nextMode === 'proverb' ? 'ပြထားတဲ့တစ်ဝက်ကို ကြည့်ပြီး ကျန်တစ်ဝက်ကို ဖြည့်ပါ။' : nextMode === 'slang' ? 'မြန်မာ keyboard နဲ့ အဖြေအပြည့်ရိုက်ပါ။' : 'စာလုံးတစ်လုံး ရွေးပြီး စတင်လိုက်ပါ။'); scored.current = false
  }
  function changeSettings(nextCategory, nextDifficulty, nextMode = mode, nextPlay = proverbPlay) {
    if (nextCategory === category && nextDifficulty === difficulty && nextMode === mode && nextPlay === proverbPlay) return
    if (!over && (guessed.length || clueShown || wrongAnswers.length || answer)) setPendingSettings({ category: nextCategory, difficulty: nextDifficulty, mode: nextMode, play: nextPlay })
    else newGame(nextCategory, nextDifficulty, nextMode, nextPlay)
  }
  function checkAnswer(value) {
    if (over || pendingSettings) return
    const normalized = normalizeSlang(value)
    if (!normalized) { setMessage('အဖြေကို မြန်မာလို ရိုက်ထည့်ပါ။'); return }
    if (wrongAnswers.includes(normalized)) { setMessage('ဒီအဖြေ စမ်းပြီးသားပါ။'); return }
    const correct = isProverb ? isProverbAnswer(puzzle, value) : isSlangAnswer(puzzle, value)
    if (correct) setSlangSolved(true)
    else { setWrongAnswers(previous => [...previous, normalized]); setMessage('မမှန်သေးဘူး။ ပြန်စမ်းကြည့်ပါ။') }
    playTone(correct)
  }
  function submitAnswer(event) {
    event.preventDefault()
    if (composing.current || event.nativeEvent.isComposing || over || pendingSettings) return
    const normalized = normalizeSlang(answer)
    if (!normalized) { setMessage('အဖြေကို မြန်မာလို ရိုက်ထည့်ပါ။'); return }
    if (!/[\u1000-\u109f]/.test(normalized)) { setMessage('မြန်မာ keyboard ကို ပြောင်းပြီး မြန်မာလို ရိုက်ပါ။'); return }
    if (wrongAnswers.includes(normalized)) { setMessage('ဒီအဖြေ စမ်းပြီးသားပါ။ အသက်ထပ်မလျော့ပါဘူး။'); return }
    checkAnswer(answer)
    answerInput.current?.focus()
  }
  function revealLetter() {
    if (over || hintUsed || pendingSettings) return
    if (isMyanmar) { setHintUsed(true); setMessage('စကားလုံးအစကို ဖော်ပေးထားပါတယ်။ အသက်မလျော့ပါဘူး။'); return }
    const remaining = [...new Set([...puzzle.word].filter(letter => !guessed.includes(letter)))]
    const letter = remaining[Math.floor(Math.random() * remaining.length)]
    setHintUsed(true); setGuessed(previous => [...previous, letter])
    setMessage(`${letter.toUpperCase()} ကို ဖော်ပေးလိုက်ပြီ။ အသက်မလျော့ပါဘူး။`); playTone(true)
  }

  return <main className={`arcade-shell viewport-game${over ? ' round-finished' : ''}`}>
    <header className="topbar">
      <a className="brand" href="./"><span className="brand-mark">A_</span><span>ASSEMBLY<span className="brand-sub">ENDGAME / WORD RESCUE</span></span></a>
      <nav className="game-nav" aria-label="Game navigation">
        <button onClick={() => setPanel('settings')}>Settings</button><button onClick={() => setPanel('leaderboard')}>Leaderboard</button><button onClick={() => setPanel('feedback')}>Feedback</button><button onClick={() => setPanel('account')}>{session ? 'ကစားသူ' : 'နာမည်ထည့်မယ်'}</button>
      </nav>
    </header>
    <section className={`game-board ${isMyanmar ? 'myanmar-board' : 'english-board'}`} aria-label="Word rescue game">
      <div className="board-top"><span className="eyebrow">{isProverb ? `စကားပုံ · ${proverbPlay === 'choice' ? 'ရွေးဖြေ' : 'ရိုက်ဖြေ'}` : isSlang ? 'MYANMAR SLANG' : `${activeCategory.label} · ${activeDifficulty.name}`}</span><span className="compact-stats">Streak {record.streak} · Best {record.best}</span></div>
      <div className="life-heading"><span>ကျန်တဲ့ မှားခွင့်</span><strong className={wrong >= 6 ? 'danger' : ''}>{8 - wrong}<span> / 8</span></strong></div>
      <div className="life-bar" aria-label={`မှားခွင့် ${8-wrong} ကြိမ်ကျန်`}>{Array.from({length:8}, (_,index) => <span key={index} className={index < 8-wrong ? 'alive' : ''}/>)}</div>
      <div className="language-chips">{languages.map((language,index) => <span key={language.name} className={`chip ${index < wrong ? 'lost' : ''}`} style={{'--chip-color':language.backgroundColor}}>{language.name}</span>)}</div>
      <div className="puzzle-space">
        {isProverb ? <div className="slang-word-area proverb-prompt" lang="my"><span className="eyebrow">ကျန်တစ်ဝက်ကို ဖြည့်ပါ</span><p className={puzzle.word.length > 80 ? 'long-proverb' : ''}>{puzzle.prefix}<span className="proverb-blank">{over ? ' ' + puzzle.suffix : ' ______'}</span></p>{hintUsed && !over && <small>အစ — {puzzle.hint}…</small>}</div> : isSlang ? <div className="slang-word-area"><span className="eyebrow">မြန်မာဗန်းစကားကို ရိုက်ဖြေပါ</span><p>{over ? puzzle.word : hintUsed ? puzzle.hint + '…' : 'ဘယ်စကားလုံးလဲ?'}</p></div> : <div className="word-area"><span className="eyebrow">{puzzle.word.length} LETTERS</span><div className={'word ' + (puzzle.word.length > 10 ? 'compact' : '')} aria-label="ခန့်မှန်းရမယ့် စကားလုံး">{[...puzzle.word].map((letter,index) => <span key={index} className={guessed.includes(letter) ? 'revealed' : lost ? 'missed' : ''}>{guessed.includes(letter) || lost ? letter.toUpperCase() : <span className="blank-mark"/>}</span>)}</div></div>}
      </div>
      <div className={'status ' + (won ? 'won' : lost ? 'failed' : '')} role="status" aria-live="polite">{won ? 'ကယ်တင်နိုင်ပြီ! နောက်တစ်ပွဲ ဆက်ကစားမယ်။' : lost ? `အဖြေ — ${puzzle.word}` : message}</div>
      {!over && <div className="hint-panel"><p>{isProverb ? 'တစ်ဝက်ကို hint အဖြစ် ပြထားပါတယ်။' : clueShown ? puzzle.clue : 'ခက်နေပြီလား? Clue ကို အခမဲ့ ကြည့်ပါ။'}</p><div className="hint-actions">{!isProverb && <button disabled={clueShown} onClick={() => setClueShown(true)}>Clue ကြည့်မယ်</button>}<button disabled={hintUsed} onClick={revealLetter}>{hintUsed ? 'Hint သုံးပြီး' : isMyanmar ? 'အစ ဖော်မယ်' : 'Letter ဖော်မယ်'}</button></div></div>}
      {!over && (isProverb && proverbPlay === 'choice' ? <div className="proverb-options" aria-label="ကျန်တစ်ဝက် ရွေးပါ">{puzzle.options.map(option => <button key={option} disabled={wrongAnswers.includes(normalizeSlang(option))} className={wrongAnswers.includes(normalizeSlang(option)) ? 'incorrect' : ''} onClick={() => checkAnswer(option)}>{option}</button>)}</div> : isMyanmar ? <form className="slang-form" onSubmit={submitAnswer}><label className="sr-only" htmlFor="slang-answer">သင့်အဖြေ</label><div><input id="slang-answer" ref={answerInput} value={answer} onChange={event => setAnswer(event.target.value)} onCompositionStart={() => { composing.current = true }} onCompositionEnd={() => { composing.current = false }} onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || composing.current || event.keyCode === 229)) event.preventDefault() }} placeholder={isProverb ? 'ကျန်တစ်ဝက်ကို ရိုက်ပါ…' : 'မြန်မာလို ရိုက်ပါ…'} lang="my" autoComplete="off" spellCheck={false} maxLength={500}/><button className="next-game" type="submit" disabled={!answer.trim()}>စစ်မယ်</button></div></form> : <div className="keyboard" aria-label="စာလုံးရွေးပါ">{['qwertyuiop','asdfghjkl','zxcvbnm'].map(row => <div className="keyboard-row" key={row}>{[...row].map(letter => <button key={letter} disabled={guessed.includes(letter)} className={guessed.includes(letter) ? puzzle.word.includes(letter) ? 'correct' : 'wrong' : ''} aria-label={`Letter ${letter.toUpperCase()}`} onClick={() => guess(letter)}>{letter.toUpperCase()}</button>)}</div>)}</div>)}
      {over && <div className="result-summary"><p>{puzzle.word}</p><button className="text-button" onClick={() => setPanel('meaning')}>အဓိပ္ပာယ် ကြည့်မယ်</button>{cloudMessage && <small role="status">{cloudMessage}{pendingCloud && <button className="text-button" onClick={retryCloud}>ပြန်သိမ်းမယ်</button>}</small>}</div>}
      <footer className="board-footer">{over ? <button className="next-game" onClick={() => newGame()}>နောက်တစ်ပွဲ ကစားမယ် →</button> : <span>{session ? 'Account ဝင်ထားပါတယ်' : 'Guest အဖြစ် ကစားနေပါတယ်'}</span>}<button className="sound-button" aria-pressed={sound} onClick={() => setSound(!sound)}>အသံ {sound ? 'ဖွင့်' : 'ပိတ်'}</button></footer>
    </section>
    {panel === 'settings' && <Panel title="ကစားမယ့်ပုံစံ" onClose={() => setPanel(null)}>
      <fieldset className="mode-picker"><legend>Game mode</legend><div>{[['english','English Words'],['slang','မြန်မာ Slang'],['proverb','မြန်မာစကားပုံ']].map(([id,label]) => <button key={id} aria-pressed={mode === id} onClick={() => changeSettings(category,difficulty,id)}>{label}</button>)}</div></fieldset>
      {!isMyanmar && <><label className="category-label" htmlFor="category">အမျိုးအစား</label><select id="category" value={category} onChange={event => changeSettings(event.target.value,difficulty)}>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><fieldset className="difficulty-picker"><legend>အခက်အခဲအဆင့်</legend><div className="difficulty-options">{difficulties.map(item => <button key={item.id} aria-pressed={difficulty === item.id} className={difficulty === item.id ? 'selected' : ''} onClick={() => changeSettings(category,item.id)}>{item.name}</button>)}</div></fieldset></>}
      {isProverb && <><fieldset className="mode-picker"><legend>ဖြေနည်း</legend><div>{[['choice','ရွေးဖြေမယ်'],['input','ရိုက်ဖြေမယ်']].map(([id,label]) => <button key={id} aria-pressed={proverbPlay === id} onClick={() => changeSettings(category,difficulty,'proverb',id)}>{label}</button>)}</div></fieldset><p>စကားပုံ {proverbCount} ပုဒ်။ အစတစ်ဝက်ကို အမြဲပြထားပါတယ်။</p></>}
      <p>မှားခွင့် ၈ ကြိမ်ရှိပါတယ်။ Hint အခမဲ့ တစ်ကြိမ်ယူနိုင်ပါတယ်။ အချိန်ကန့်သတ်ချက် မရှိပါ။</p>
      <button className="next-game" onClick={() => setPanel(null)}>ဆက်ကစားမယ်</button>
    </Panel>}
    {panel === 'account' && <Panel title={session ? 'သင့်ကစားသူနာမည်' : 'နာမည်ထည့်ပြီး စကစားပါ'} onClose={() => setPanel(null)}><Account session={session} confirmGoogleName={googleSetup} onPlayerReady={userId => newGame(category, difficulty, mode, proverbPlay, userId)}/></Panel>}
    {panel === 'feedback' && <Panel title="Feedback ပေးမယ်" onClose={() => setPanel(null)}><Feedback key={session?.user.id || 'guest'} session={session} onSignIn={() => setPanel('account')}/></Panel>}
    {panel === 'leaderboard' && <Panel title="Leaderboard" onClose={() => setPanel(null)}><Leaderboard initialMode={statsKey} userId={session?.user.id}/></Panel>}
    {panel === 'meaning' && <Panel title="အဖြေနဲ့ အဓိပ္ပာယ်" onClose={() => setPanel(null)}><h3>{puzzle.word}</h3><p>{puzzle.meaning}</p><button className="next-game" onClick={() => newGame()}>နောက်တစ်ပွဲ ကစားမယ် →</button></Panel>}
    {won && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && <ReactConfetti recycle={false} numberOfPieces={80} style={{position:'fixed',pointerEvents:'none'}}/>}
    {pendingSettings && <Panel className="confirm" title="ပွဲအသစ် ပြန်စမလား?" onClose={() => setPendingSettings(null)}><p>လက်ရှိပွဲကို ရပ်ပြီး ရွေးထားတဲ့ပုံစံနဲ့ ပွဲအသစ် စပါမယ်။</p><button onClick={() => setPendingSettings(null)}>လက်ရှိပွဲ ဆက်ကစားမယ်</button><button className="next-game" onClick={() => newGame(pendingSettings.category,pendingSettings.difficulty,pendingSettings.mode,pendingSettings.play)}>ပြောင်းပြီး ပွဲအသစ်စမယ်</button></Panel>}
  </main>
}
