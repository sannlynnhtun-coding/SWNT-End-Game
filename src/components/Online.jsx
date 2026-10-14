import { useEffect, useState } from 'react'
import { supabase, onlineError } from '../supabase'

export default function Account({ session }) {
  const [signup, setSignup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [name, setName] = useState(session?.user.user_metadata?.display_name || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  async function submit(event) {
    event.preventDefault(); setBusy(true); setNotice('')
    try {
      if (session) {
        const { error } = await supabase.rpc('set_player_name', { player_name: name.trim() })
        if (error) throw error
        const { error: metadataError } = await supabase.auth.updateUser({ data: { display_name: name.trim() } })
        if (metadataError) throw metadataError
        setNotice('နာမည် သိမ်းပြီးပါပြီ။')
      } else {
        const result = signup
          ? await supabase.auth.signUp({ email, password, options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin } })
          : await supabase.auth.signInWithPassword({ email, password })
        if (result.error) throw result.error
        setPassword('')
        setNotice(signup && !result.data.session ? 'Email ထဲက အတည်ပြု link ကို နှိပ်ပြီး ဝင်ပါ။' : 'ဝင်ရောက်ပြီးပါပြီ။')
      }
    } catch (error) { setNotice(onlineError(error)) }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true)
    const { error } = await supabase.auth.signOut()
    setNotice(error ? onlineError(error) : 'ထွက်ပြီးပါပြီ။')
    setBusy(false)
  }
  return <div className="account-content">
    <p>Account မဝင်ဘဲလည်း ကစားနိုင်ပါတယ်။ ဝင်ထားရင် ပွဲအသစ်ကနေစပြီး အနိုင်ရလဒ်တွေကို leaderboard မှာ သိမ်းပေးပါမယ်။</p>
    <form onSubmit={submit}>
      {(session || signup) && <label>ကစားသူနာမည်<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={30} required autoComplete="nickname" /></label>}
      {!session && <><label>Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" minLength={8} required autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label></>}
      <button className="next-game" disabled={busy}>{busy ? 'ခဏစောင့်ပါ…' : session ? 'နာမည် သိမ်းမယ်' : signup ? 'Account ဖန်တီးမယ်' : 'ဝင်မယ်'}</button>
    </form>
    {session ? <button className="text-button" disabled={busy} onClick={logout}>Account မှ ထွက်မယ်</button> : <button className="text-button" disabled={busy} onClick={() => { setSignup(!signup); setNotice('') }}>{signup ? 'Account ရှိပြီးသား — ဝင်မယ်' : 'Account အသစ် ဖန်တီးမယ်'}</button>}
    <p role="status">{notice}</p>
  </div>
}

const modes = [['normal', 'English · Normal'], ['easy', 'English · Easy'], ['hard', 'English · Hard'], ['slang', 'မြန်မာ Slang'], ['proverb-choice', 'စကားပုံ · ရွေးဖြေ'], ['proverb-input', 'စကားပုံ · ရိုက်ဖြေ']]
export function Leaderboard({ initialMode, userId }) {
  const [mode, setMode] = useState(initialMode)
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    supabase.rpc('get_leaderboard', { game_mode: mode }).then(({ data, error }) => {
      if (!active) return
      if (error) { setError(onlineError(error)); setStatus('error') }
      else { setRows(data || []); setStatus('ready') }
    }).catch(error => { if (active) { setError(onlineError(error)); setStatus('error') } })
    return () => { active = false }
  }, [mode, attempt])
  return <div className="leaderboard-content"><label htmlFor="ranking-mode">Leaderboard အမျိုးအစား</label><select id="ranking-mode" value={mode} onChange={e => { setMode(e.target.value); setStatus('loading') }}>{modes.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select>
    <p>အနိုင်ရပွဲအရေအတွက်နဲ့ အဆင့်စီထားပါတယ်။ နောက်တစ်ဆင့်မှာ အကောင်းဆုံး streak ကို နှိုင်းယှဉ်ပါတယ်။</p>
    {status === 'loading' ? <p role="status">ရလဒ်တွေ ယူနေပါတယ်…</p> : status === 'error' ? <div role="status"><p>{error}</p><button onClick={() => { setStatus('loading'); setAttempt(attempt + 1) }}>ပြန်စမ်းမယ်</button></div> : !rows.length ? <p>ရလဒ် မရှိသေးပါ။ ပထမဆုံး ကစားသူ ဖြစ်လိုက်ပါ!</p> : <ol className="ranking-list">{rows.map((row, index) => <li key={row.player_id} className={row.player_id === userId ? 'your-rank' : ''}><span className="rank-number">{index+1}</span><span>{row.display_name}{row.player_id === userId && <small> သင်</small>}</span><strong>{row.wins}<small> နိုင်ပွဲ · streak {row.best_streak}</small></strong></li>)}</ol>}
    <p className="ranking-note">ပျော်ပျော်ပါးပါး ကစားရန် leaderboard ဖြစ်ပါတယ်။</p>
  </div>
}
