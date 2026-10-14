import { useCallback, useEffect, useRef, useState } from 'react'
import { languages } from './languages'
import { categories, difficulties, drawPuzzle } from './gameData'
import { drawSlang, isSlangAnswer, normalizeSlang } from './slangData'
import { drawProverb, isProverbAnswer, proverbCount } from './proverbData'
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
    if (isMyanmar || over || pendingSettings || guessed.includes(letter)) return
    const correct = puzzle.word.includes(letter)
    setGuessed(previous => [...previous, letter])
    setMessage(correct ? `${letter.toUpperCase()} ပါတယ်။ ကယ်တင်ဖို့ နီးလာပြီ!` : `${letter.toUpperCase()} မပါဘူး။ ${languages[wrong].name} ထွက်သွားပြီ… ဆက်ကြိုးစားမယ်!`)
    playTone(correct)
  }, [isMyanmar, over, pendingSettings, guessed, puzzle.word, wrong, playTone])

  useEffect(() => {
    function onKey(event) {
      if (pendingSettings) {
        if (event.key === 'Escape') setPendingSettings(null)
        if (event.key === 'Tab') {
          const buttons = [...document.querySelectorAll('.confirm button')]
          const target = event.shiftKey ? buttons[0] : buttons[buttons.length - 1]
          if (document.activeElement === target) { event.preventDefault(); (event.shiftKey ? buttons[buttons.length - 1] : buttons[0]).focus() }
        }
        return
      }
      if (isMyanmar || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return
      if (/^[a-z]$/i.test(event.key)) { event.preventDefault(); guess(event.key.toLowerCase()) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [guess, pendingSettings, isMyanmar])

  useEffect(() => {
    if (!over || scored.current) return
    scored.current = true
    const current = stats[statsKey]
    const streak = won ? current.streak + 1 : 0
    setStats({ ...stats, [statsKey]: { streak, best: Math.max(current.best, streak), wins: current.wins + (won ? 1 : 0) } })
  }, [over, won, stats, statsKey])

  function newGame(nextCategory = category, nextDifficulty = difficulty, nextMode = mode, nextPlay = proverbPlay) {
    const nextStatsKey = nextMode === 'proverb' ? `proverb-${nextPlay}` : nextMode === 'slang' ? 'slang' : nextDifficulty
    if (nextStatsKey !== statsKey) {
      setStats(previous => ({ ...previous, [nextStatsKey]: { ...previous[nextStatsKey], streak: 0 } }))
    }
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

  return <main className="arcade-shell">
    <header className="topbar"><a className="brand" href="./"><span className="brand-mark">A_</span><span>ASSEMBLY<span className="brand-sub">ENDGAME / WORD RESCUE</span></span></a><button className="sound-button" aria-pressed={sound} onClick={() => setSound(!sound)}>အသံ {sound ? 'ဖွင့်ထား' : 'ပိတ်ထား'}</button></header>
    <div className="game-layout">
      <aside className="sidebar"><span className="eyebrow">CHOOSE YOUR MISSION</span><h1>စာလုံးရှာပါ။<br/><span>ကမ္ဘာကို ကယ်ပါ။</span></h1><p className="intro">စာလုံးမှားတိုင်း language တစ်ခု ပျောက်မယ်။ Assembly ပဲ မကျန်ခဲ့စေနဲ့!</p>
        <fieldset className="mode-picker"><legend>ကစားမယ့်ပုံစံ</legend><div><button aria-pressed={mode === 'english'} onClick={() => changeSettings(category, difficulty, 'english')}>English Words</button><button aria-pressed={isSlang} onClick={() => changeSettings(category, difficulty, 'slang')}>မြန်မာ Slang</button><button aria-pressed={isProverb} onClick={() => changeSettings(category, difficulty, 'proverb')}>မြန်မာစကားပုံ</button></div></fieldset>
        {!isMyanmar && <><label className="category-label" htmlFor="category">အမျိုးအစား ရွေးပါ</label><select id="category" value={category} onChange={event => changeSettings(event.target.value, difficulty)}>{categories.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
        <fieldset className="difficulty-picker"><legend>အခက်အခဲအဆင့် ရွေးပါ</legend><div className="difficulty-options">{difficulties.map(item => <button key={item.id} type="button" aria-pressed={difficulty === item.id} className={difficulty === item.id ? 'selected' : ''} onClick={() => changeSettings(category, item.id)}>{item.name}</button>)}</div><p>{activeDifficulty.description}</p></fieldset></>}
        {isProverb && <><fieldset className="mode-picker"><legend>စကားပုံ ဖြေနည်း</legend><div>{[['choice','ရွေးဖြေမယ်'],['input','ရိုက်ဖြေမယ်']].map(([id,label]) => <button key={id} aria-pressed={proverbPlay === id} onClick={() => changeSettings(category, difficulty, 'proverb', id)}>{label}</button>)}</div></fieldset><p className="slang-intro">စကားပုံ {proverbCount} ပုဒ် · တစ်ဝက်ကို အစကတည်းက ဖော်ပြထားပါတယ်။ ကျန်တစ်ဝက်ကို ဖြည့်ပါ။</p></>}
        {isSlang && <p className="slang-intro">ဗန်းစကား ၂၀ လုံး · မြန်မာလိုရိုက်ဖြေပါ။ Clue အစကတည်းကပြထားပါတယ်။</p>}
        <div className="stats"><div><strong>{record.streak.toString().padStart(2,'0')}</strong><span>ဆက်တိုက်နိုင်ပွဲ</span></div><div><strong>{record.best.toString().padStart(2,'0')}</strong><span>{isProverb ? (proverbPlay === 'choice' ? 'ရွေးဖြေ' : 'ရိုက်ဖြေ') : isSlang ? 'Slang' : activeDifficulty.name} အကောင်းဆုံး</span></div></div>
        <div className="instructions"><span className="eyebrow">HOW TO PLAY</span><p>01 <span>{isProverb ? 'စကားပုံရဲ့ ကျန်တစ်ဝက်ကို ဖြည့်ပါ။' : isSlang ? 'မြန်မာစကားလုံးအပြည့် ရိုက်ပါ။' : 'English word ကို ခန့်မှန်းပါ။'}</span></p><p>02 <span>မှားခွင့် ၈ ကြိမ် ရှိပါတယ်။</span></p><p>03 <span>ခက်နေရင် hint ယူပါ။</span></p></div><p className="sidebar-foot">NO TIMER. TAKE YOUR TIME.</p>
      </aside>
      <section className="game-board" aria-label="Word rescue game">
        <div className="board-top"><span className="eyebrow">MISSION / {isProverb ? 'MYANMAR PROVERBS' : isSlang ? 'MYANMAR SLANG' : activeCategory.label + ' · ' + activeDifficulty.name.toUpperCase()}</span><span className={'live-label ' + (over ? 'finished' : '')}>{over ? 'ROUND COMPLETE' : 'GAME ON'}</span></div>
        <div className="life-heading"><span>ကျန်တဲ့ မှားခွင့်</span><strong className={wrong >= 6 ? 'danger' : ''}>{8 - wrong}<span> / 8</span></strong></div>
        <div className="life-bar" aria-label={`မှားခွင့် ${8-wrong} ကြိမ်ကျန်`}>{Array.from({length:8}, (_,index) => <span key={index} className={index < 8-wrong ? 'alive' : ''}/>)}</div>
        <div className="language-chips">{languages.map((language,index) => <span key={language.name} className={`chip ${index < wrong ? 'lost' : ''} ${index === 8 ? 'assembly' : ''}`} style={{'--chip-color':language.backgroundColor}}>{index < wrong && <span aria-label="ပျောက်သွားပြီ">× </span>}{language.name}</span>)}</div>
        {isProverb ? <div className="slang-word-area proverb-prompt" lang="my"><span className="eyebrow">MYANMAR PROVERBS / မြန်မာစကားပုံ</span><p>{puzzle.prefix}<span className="proverb-blank">{over ? puzzle.suffix : ' ______'}</span></p>{hintUsed && !over && <p>ကျန်တစ်ဝက်၏အစ — {puzzle.hint}…</p>}</div> : isSlang ? <div className="slang-word-area"><span className="eyebrow">MYANMAR SLANG / မြန်မာဗန်းစကား</span><p>{over ? puzzle.word : hintUsed ? puzzle.hint + '…' : 'အဖြေကို မြန်မာလို ရိုက်ပါ'}</p></div> : <div className="word-area"><span className="eyebrow">{puzzle.word.length} LETTERS · {activeCategory.label}</span><div className={"word " + (puzzle.word.length > 10 ? "compact" : "")} aria-label="ခန့်မှန်းရမယ့် စကားလုံး">{[...puzzle.word].map((letter,index) => <span key={index} className={guessed.includes(letter) ? 'revealed' : lost ? 'missed' : ''}>{guessed.includes(letter) || lost ? letter.toUpperCase() : <span className="blank-mark"/>}</span>)}</div></div> }
        <div className={'status ' + (won ? 'won' : lost ? 'failed' : '')} role="status" aria-live="polite">{won ? 'ကယ်တင်နိုင်ပြီ! အားလုံး လွတ်မြောက်သွားပြီ။' : lost ? 'ဒီပွဲ ရှုံးသွားပြီ။ နောက်တစ်ပွဲ ထပ်ကြိုးစားမယ်!' : message}{over && <p><strong>{puzzle.word.toUpperCase()}</strong> — {puzzle.meaning}</p>}</div>
        <div className="hint-panel"><div><span className="eyebrow">MISSION INTEL / အရိပ်အမြွက်</span><p>{isProverb ? (over ? puzzle.meaning : 'စကားပုံရဲ့ ကျန်တစ်ဝက်ကို ဖြည့်ပါ။ ဖြေပြီးရင် အဓိပ္ပာယ်ကို ပြပေးပါမယ်။') : clueShown || over ? puzzle.clue : 'ခက်နေပြီလား? မြန်မာလို clue ကို အခမဲ့ ကြည့်နိုင်ပါတယ်။'}</p></div><div className="hint-actions"><button disabled={clueShown || over} onClick={() => setClueShown(true)}>{clueShown ? 'Clue ပြထားပြီး' : 'Clue ကြည့်မယ်'}<small>အခမဲ့</small></button><button disabled={hintUsed || over} onClick={revealLetter}>{hintUsed ? 'အသုံးပြုပြီး' : isMyanmar ? 'စကားလုံးအစ ဖော်မယ်' : 'Letter ဖော်မယ်'}<small>{hintUsed ? '၀ ကြိမ်ကျန်' : '၁ ကြိမ်ကျန် · အခမဲ့'}</small></button></div></div>
        {isProverb && proverbPlay === 'choice' ? <div className="proverb-options" aria-label="ကျန်တစ်ဝက် ရွေးပါ">{puzzle.options.map(option => <button key={option} disabled={over || wrongAnswers.includes(normalizeSlang(option))} className={wrongAnswers.includes(normalizeSlang(option)) ? 'incorrect' : ''} onClick={() => checkAnswer(option)}>{option}</button>)}</div> : isMyanmar ? <form className="slang-form" onSubmit={submitAnswer}><label htmlFor="slang-answer">သင့်အဖြေ</label><div><input id="slang-answer" ref={answerInput} value={answer} onChange={event => setAnswer(event.target.value)} onCompositionStart={() => { composing.current = true }} onCompositionEnd={() => { composing.current = false }} onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || composing.current || event.keyCode === 229)) event.preventDefault() }} placeholder="မြန်မာလို ရိုက်ထည့်ပါ…" lang="my" autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={over} maxLength={500} /><button className="next-game" type="submit" disabled={over || !answer.trim()}>အဖြေစစ်မယ်</button></div><p>Gboard သို့မဟုတ် ကိုယ့်မြန်မာ keyboard ကို သုံးပါ။ Submit နှိပ်မှ အဖြေစစ်မယ်။</p>{isSlang && <a href="https://bansagar.com/" target="_blank" rel="noreferrer">စကားလုံးအဓိပ္ပာယ် အရင်းအမြစ် — Bansagar ↗</a>}</form> : <div className="keyboard" aria-label="စာလုံးရွေးပါ">{['qwertyuiop','asdfghjkl','zxcvbnm'].map(row => <div className="keyboard-row" key={row}>{[...row].map(letter => <button key={letter} disabled={over || guessed.includes(letter)} className={guessed.includes(letter) ? puzzle.word.includes(letter) ? 'correct' : 'wrong' : ''} aria-label={`Letter ${letter.toUpperCase()}${guessed.includes(letter) ? puzzle.word.includes(letter) ? ', correct' : ', incorrect' : ''}`} onClick={() => guess(letter)}>{letter.toUpperCase()}</button>)}</div>)}</div> }
        <footer className="board-footer">{over ? <button className="next-game" onClick={() => newGame()}>နောက်တစ်ပွဲ ကစားမယ် →</button> : <span>{isProverb ? 'ပြထားတဲ့တစ်ဝက်ကို ဆက်ဖြည့်ပါ။' : isSlang ? 'စာလုံးပေါင်းနဲ့ space အပိုတွေကို စစ်ပြီး Submit နှိပ်ပါ။' : 'Screen ပေါ်မှာ နှိပ်ပါ၊ သို့မဟုတ် keyboard နဲ့ ရိုက်ပါ။'}</span>}<span className="round-tag">SAVE THE STACK.</span></footer>
      </section>
    </div>
    {won && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && <ReactConfetti recycle={false} numberOfPieces={160} style={{position:'fixed',pointerEvents:'none'}}/>}
    {pendingSettings && <div className="modal-backdrop"><section className="confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">ပွဲအသစ် ပြန်စမလား?</h2><p>{pendingSettings.mode === 'proverb' ? 'မြန်မာစကားပုံ' : pendingSettings.mode === 'slang' ? 'မြန်မာ Slang' : categories.find(item => item.id === pendingSettings.category).name + ' / ' + difficulties.find(item => item.id === pendingSettings.difficulty).name} နဲ့ ပွဲပြန်စပါမယ်။{(pendingSettings.difficulty !== difficulty || pendingSettings.mode !== mode) && " အဆင့်ပြောင်းရင် လက်ရှိ streak ကို အသစ်စပါမယ်။"}</p><button autoFocus onClick={() => setPendingSettings(null)}>လက်ရှိပွဲ ဆက်ကစားမယ်</button><button className="next-game" onClick={() => newGame(pendingSettings.category, pendingSettings.difficulty, pendingSettings.mode, pendingSettings.play)}>ပြောင်းပြီး ပွဲအသစ်စမယ်</button></section></div>}
  </main>
}



