import { useEffect, useRef, useState } from 'react'
import { supabase, onlineError } from '../supabase'

function feedbackError(error) {
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error?.code)) return 'Feedback လက်ခံတဲ့စနစ်ကို Server မှာ ပြင်ဆင်နေဆဲပါ။ ခဏနေ ပြန်စမ်းပါ။'
  if (error?.message?.includes('feedback_invalid_length')) return 'စာသားကို ၁၀ လုံးမှ ၂၀၀၀ လုံးအတွင်း ရေးပါ။'
  return onlineError(error)
}
export default function Feedback({ session, onSignIn }) {
  const [message, setMessage] = useState('')
  const [kind, setKind] = useState('suggestion')
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const guard = useRef(false)
  const mounted = useRef(false)
  const resetTimer = useRef(null)
  const playerId = session?.user.id
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; clearTimeout(resetTimer.current) }
  }, [])
  function scheduleReset(data) {
    clearTimeout(resetTimer.current)
    if (data.submitted && Number.isFinite(data.seconds_until_reset)) {
      resetTimer.current = setTimeout(() => {
        if (mounted.current) { setStatus('loading'); setNotice(''); setRetry(value => value + 1) }
      }, Math.max(1000, data.seconds_until_reset * 1000 + 250))
    }
  }
  useEffect(() => {
    if (!playerId) return
    let active = true
    supabase.rpc('get_feedback_status').then(({ data, error }) => {
      if (!active) return
      if (error) { setStatus('error'); setNotice(feedbackError(error)) }
      else { setStatus(data?.submitted ? 'submitted' : 'ready'); scheduleReset(data || {}) }
    }).catch(error => { if (active) { setStatus('error'); setNotice(feedbackError(error)) } })
    return () => { active = false; clearTimeout(resetTimer.current) }
  }, [playerId, retry])
  async function submit(event) {
    event.preventDefault()
    const text = message.trim()
    if (guard.current || status !== 'ready' || !playerId || [...text].length < 10 || [...text].length > 2000) return
    guard.current = true; setBusy(true); setNotice('')
    try {
      const { data, error } = await supabase.rpc('submit_feedback', { feedback_text: text, feedback_kind: kind })
      if (!mounted.current) return
      if (error) {
        if (error.message?.includes('feedback_daily_limit')) {
          setStatus('submitted'); setNotice('ဒီနေ့အတွက် feedback ပို့ပြီးသားပါ။ နောက်နေ့မှ ထပ်ပို့နိုင်ပါတယ်။')
          setRetry(value => value + 1)
        } else setNotice(feedbackError(error))
      } else {
        setStatus('submitted'); setMessage(''); scheduleReset(data || {})
        setNotice('Feedback ပို့ပြီးပါပြီ။ အကြံပြုပေးတာ ကျေးဇူးတင်ပါတယ်။')
      }
    } catch (error) { if (mounted.current) setNotice(feedbackError(error)) }
    finally { guard.current = false; if (mounted.current) setBusy(false) }
  }
  if (!session) return <div className="feedback-content"><p>Feedback ပို့ဖို့ ကစားသူအဖြစ် ဝင်ပါ။ နာမည်တစ်ခုပဲထည့်ခြင်း၊ Google သို့မဟုတ် email account နဲ့ ဝင်နိုင်ပါတယ်။</p><button className="next-game" onClick={onSignIn}>နာမည်နဲ့ ဝင်မယ်</button></div>
  return <div className="feedback-content"><p>ကစားသူတစ်ယောက်ကို တစ်နေ့ feedback တစ်ခု ပို့နိုင်ပါတယ်။ မြန်မာအချိန် ည ၁၂ နာရီမှာ နေ့အသစ်စပါမယ်။</p>
    {status === 'loading' ? <p role="status">ဒီနေ့ ပို့ထားခြင်း ရှိမရှိ စစ်နေပါတယ်…</p> : status === 'error' ? <div><p role="status">{notice}</p><button onClick={() => { setStatus('loading'); setRetry(value => value + 1) }}>ပြန်စစ်မယ်</button></div> : status === 'submitted' ? <p role="status">{notice || 'ဒီနေ့ feedback ပို့ပြီးသားပါ။ နောက်နေ့မှ ထပ်ပို့နိုင်ပါတယ်။'}</p> : <form onSubmit={submit}>
      <label htmlFor="feedback-kind">Feedback အမျိုးအစား</label><select id="feedback-kind" value={kind} onChange={event => setKind(event.target.value)} disabled={busy}><option value="suggestion">အကြံပြုချက်</option><option value="bug">အမှားတွေ့ရှိမှု</option><option value="other">အခြား</option></select>
      <label htmlFor="feedback-message">သင့်အကြံပြုချက်</label><textarea id="feedback-message" value={message} onChange={event => setMessage(event.target.value)} minLength={10} maxLength={2000} required rows={6} disabled={busy} placeholder="ပြင်စေချင်တာ၊ အမှားတွေ့တာကို ရေးပေးပါ…" aria-describedby="feedback-count" />
      <small id="feedback-count">{[...message.trim()].length} / 2000 · အနည်းဆုံး ၁၀ လုံး</small><button className="next-game" disabled={busy || [...message.trim()].length < 10}>{busy ? 'ပို့နေပါတယ်…' : 'Feedback ပို့မယ်'}</button><p role="status">{notice}</p>
    </form>}
    <p className="ranking-note">Feedback ကို developer ပဲ ဖတ်နိုင်ပါတယ်။ Public leaderboard မှာ မပြပါဘူး။ <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a></p>
  </div>
}
