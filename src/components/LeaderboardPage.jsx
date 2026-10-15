import { useEffect, useState } from 'react'
import { supabase, onlineError } from '../supabase'
import { proverbCount } from '../proverbData'
import { formatTime } from '../time'
import './leaderboard.css'

const groups = [
  { id: 'proverb', label: 'စကားပုံ', modes: [['proverb-choice', 'ရွေးဖြေ'], ['proverb-input', 'ရိုက်ဖြေ']] },
  { id: 'slang', label: 'Slang', modes: [['slang', 'မြန်မာ Slang']] },
  { id: 'english', label: 'English', modes: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']] },
]

function PlayerRow({ row, userId }) {
  return <>
    <span className="leaderboard-rank">#{row.rank}</span>
    <span className="leaderboard-avatar" aria-hidden="true">{Array.from(row.display_name.trim())[0] || '?'}</span>
    <div className="leaderboard-player"><strong>{row.display_name}{row.player_id === userId && <span className="leaderboard-you-label"> သင်</span>}</strong><span>Best streak {row.best_streak} · စကားပုံနိုင်ပွဲ {row.proverb_wins}</span></div>
    <div className="leaderboard-score"><strong>{row.wins} <small>နိုင်ပွဲ</small></strong><span>{row.average_ms == null ? 'အချိန် မရှိသေး' : `ပျမ်းမျှ ${formatTime(row.average_ms)}`}</span></div>
  </>
}

export default function LeaderboardPage({ initialMode, userId, onBack, headingRef }) {
  const [mode, setMode] = useState(initialMode)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    supabase.rpc('get_timed_leaderboard', { game_mode: mode }).then(({ data, error }) => {
      if (!active) return
      if (error) { setError(onlineError(error)); setStatus('error') }
      else { setResult(data); setStatus('ready') }
    }).catch(error => { if (active) { setError(onlineError(error)); setStatus('error') } })
    return () => { active = false }
  }, [mode, attempt])
  const rows = result?.rows || []
  const ready = status === 'ready'
  const group = groups.find(item => item.modes.some(([id]) => id === mode)) || groups[0]
  const personalRow = rows.find(row => row.player_id === userId)
  function chooseMode(nextMode) { if (nextMode !== mode) { setMode(nextMode); setStatus('loading') } }
  return <section className="leaderboard-page" aria-labelledby="leaderboard-title">
    <header className="leaderboard-header">
      <button className="setup-back" onClick={onBack} aria-label="နောက်သို့ / Back">← Back</button>
      <h1 id="leaderboard-title" ref={headingRef} tabIndex={-1}>Leaderboard</h1>
      <svg className="leaderboard-trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-5 3h10m-8-3h6v3H9z" /></svg>
    </header>
    <div className="leaderboard-totals">
      <div><strong>{ready ? result.total_users.toLocaleString() : '—'}</strong><span>ကစားသူ · Players</span></div>
      <div><strong>{proverbCount.toLocaleString()}</strong><span>စကားပုံ · Proverbs</span></div>
    </div>
    <p className="leaderboard-total-wins">စကားပုံနိုင်ပွဲ စုစုပေါင်း <strong>{ready ? result.total_proverb_wins.toLocaleString() : '—'}</strong></p>
    <nav className="leaderboard-filters" aria-label="Leaderboard game">
      <div className="leaderboard-games">{groups.map(item => <button key={item.id} aria-pressed={group.id === item.id} onClick={() => chooseMode(item.modes[0][0])}>{item.label}</button>)}</div>
      {group.modes.length > 1 && <div className="leaderboard-subfilters" aria-label="Game variant">{group.modes.map(([id, label]) => <button key={id} lang={group.id === 'english' ? 'en' : 'my'} aria-pressed={mode === id} onClick={() => chooseMode(id)}>{label}</button>)}</div>}
    </nav>
    <p className="leaderboard-rule">နိုင်ပွဲတူရင် ပျမ်းမျှဖြေချိန် ပိုမြန်သူက အပေါ်ရောက်ပါမယ်။</p>
    <div aria-busy={status === 'loading'}>
      {status === 'loading' ? <p role="status">ရလဒ်တွေ ယူနေပါတယ်…</p> : status === 'error' ? <div role="alert"><p>{error}</p><button onClick={() => { setStatus('loading'); setAttempt(value => value + 1) }}>ပြန်စမ်းမယ်</button></div> : <>
        {userId && <section className="leaderboard-personal" aria-label="Your position"><h2>သင့်အဆင့် · Your position</h2>{personalRow ? <div className="leaderboard-personal-row"><PlayerRow row={personalRow} userId={userId} /></div> : <p>ဒီအမျိုးအစားရဲ့ Top 100 စာရင်းမှာ သင့်ရလဒ် မရှိသေးပါ။</p>}</section>}
        <div className="leaderboard-list-heading"><h2>Top 100</h2><p className="leaderboard-count">ကစားသူ {result.participants.toLocaleString()} ဦး · ပြသထားသူ {rows.length} ဦး</p></div>
        {!rows.length ? <p>ရလဒ် မရှိသေးပါ။ ပထမဆုံး ကစားသူ ဖြစ်လိုက်ပါ!</p> : <ol className="leaderboard-players">{rows.map(row => <li key={row.player_id} className={`${row.rank <= 3 ? 'leaderboard-winner' : ''} ${row.player_id === userId ? 'leaderboard-you' : ''}`}><PlayerRow row={row} userId={userId} /></li>)}</ol>}

      </>}
    </div>
    <p className="leaderboard-note">ပျမ်းမျှအချိန်ကို အချိန်မှတ်ထားသော နိုင်ပွဲများမှ တွက်ထားပါတယ်။ အဟောင်းပွဲများကို ၀ စက္ကန့်လို့ မတွက်ပါ။ အချိန်လည်းတူရင် best streak နဲ့ စီပါတယ်။</p>

  </section>
}

