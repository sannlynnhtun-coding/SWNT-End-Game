import { useEffect, useState } from 'react'
import { supabase, onlineError } from '../supabase'

export default function Account({ session, onPlayerReady, confirmGoogleName = false }) {
  const [guest, setGuest] = useState(true)
  const [signup, setSignup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [name, setName] = useState(session?.user.user_metadata?.display_name || session?.user.user_metadata?.full_name || session?.user.user_metadata?.name || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setNotice('')
    try {
      const playerName = name.trim()
      if ((session || guest || signup) && (playerName.length < 2 || playerName.length > 30)) {
        setNotice('နာမည်ကို ၂ လုံးမှ ၃၀ လုံးအတွင်း ထည့်ပါ။'); return
      }
      if (session) {
        const { error } = await supabase.rpc('set_player_name', { player_name: playerName })
        if (error) throw error
        const { error: metadataError } = await supabase.auth.updateUser({ data: { display_name: playerName } })
        if (metadataError) throw metadataError
        if (confirmGoogleName) onPlayerReady(session.user.id)
        else setNotice('နာမည် သိမ်းပြီးပါပြီ။')
      } else {
        const result = guest
          ? await supabase.auth.signInAnonymously({ options: { data: { display_name: playerName } } })
          : signup
            ? await supabase.auth.signUp({ email, password, options: { data: { display_name: playerName }, emailRedirectTo: window.location.origin } })
            : await supabase.auth.signInWithPassword({ email, password })
        if (result.error) throw result.error
        setPassword('')
        if (result.data.session) {
          if (guest) {
            const { error } = await supabase.rpc('set_player_name', { player_name: playerName })
            if (error) throw error
          }
          onPlayerReady(result.data.user.id)
        } else setNotice('Email ထဲက အတည်ပြု link ကို နှိပ်ပြီး ဝင်ပါ။')
      }
    } catch (error) { setNotice(onlineError(error)) }
    finally { setBusy(false) }
  }
  async function googleLogin() {
    if (busy) return
    setBusy(true); setNotice('')
    try {
      const credentials = { provider: 'google', options: { redirectTo: window.location.origin + '/?login=google', scopes: 'openid email profile' } }
      const { error } = session?.user.is_anonymous
        ? await supabase.auth.linkIdentity(credentials)
        : await supabase.auth.signInWithOAuth(credentials)
      if (error) throw error
    } catch (error) { setNotice(onlineError(error)); setBusy(false) }
  }
  async function logout() {
    setBusy(true)
    try {
      const { error } = await supabase.auth.signOut()
      setNotice(error ? onlineError(error) : 'ထွက်ပြီးပါပြီ။')
    } catch (error) { setNotice(onlineError(error)) }
    finally { setBusy(false) }
  }
  return <div className="account-content">
    <p>{session ? 'နာမည်ကို ပြောင်းသိမ်းနိုင်ပါတယ်။ နိုင်ပွဲနဲ့ အကောင်းဆုံး streak ကို mode အလိုက် leaderboard မှာ သိမ်းပေးပါမယ်။' : guest ? 'နာမည်တစ်ခုပဲ ထည့်ပြီး စကစားပါ။ Email နဲ့ password မလိုပါဘူး။ သင့်နိုင်ပွဲတွေကို leaderboard မှာ သိမ်းပေးပါမယ်။' : 'Account နဲ့ ဝင်ပြီး စက်မတူလည်း သင့်ရလဒ်တွေကို ဆက်သုံးနိုင်ပါတယ်။'}</p>
    {!session && guest && <p className="ranking-note">ဒီ browser မှာ ကစားသူကို မှတ်ထားပါမယ်။ နာမည်တစ်ခုတည်းနဲ့ အခြားစက်ကနေ အကောင့်ပြန်ဝင်လို့ မရပါဘူး။</p>}
    {(!session || session.user.is_anonymous) && <><button type="button" className="google-login" onClick={googleLogin} disabled={busy}>Continue with Google</button><p className="auth-divider">သို့မဟုတ်</p></>}
    {confirmGoogleName && <p>Leaderboard မှာ ပြမယ့်နာမည်ကို အတည်ပြုပြီး ပွဲအသစ်စပါ။</p>}
    <form onSubmit={submit}>
      {(session || signup || guest) && <label>ကစားသူနာမည်<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={30} required autoComplete="nickname" disabled={busy} /></label>}
      {!session && !guest && <><label>Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label><label>Password<input type="password" minLength={8} required autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label></>}
      <button className="next-game" disabled={busy}>{busy ? 'ခဏစောင့်ပါ…' : session ? confirmGoogleName ? 'နာမည်နဲ့ စကစားမယ်' : 'နာမည် သိမ်းမယ်' : guest ? 'နာမည်နဲ့ စကစားမယ်' : signup ? 'Account ဖန်တီးမယ်' : 'ဝင်မယ်'}</button>
    </form>
    {session ? <button className="text-button" disabled={busy} onClick={logout}>ကစားသူအဖြစ်မှ ထွက်မယ်</button> : <><button className="text-button" disabled={busy} onClick={() => { setGuest(!guest); setSignup(false); setNotice('') }}>{guest ? 'Email account နဲ့ ဝင်မယ်' : 'နာမည်တစ်ခုပဲ ထည့်ကစားမယ်'}</button>{!guest && <button className="text-button" disabled={busy} onClick={() => { setSignup(!signup); setNotice('') }}>{signup ? 'Account ရှိပြီးသား — ဝင်မယ်' : 'Account အသစ် ဖန်တီးမယ်'}</button>}</>}
    <p className="auth-policy">ဝင်ရောက်ခြင်းဖြင့် <a href="/terms.html" target="_blank" rel="noreferrer">Terms</a> ကို သဘောတူပြီး <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a> ကို ဖတ်ရှုနိုင်ပါတယ်။</p>
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
