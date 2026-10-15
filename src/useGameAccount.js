import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase, onlineError } from './supabase'

function readQueue() {
  try { const rows = JSON.parse(localStorage.getItem('assembly-cloud-outbox-v1')); return Array.isArray(rows) ? rows.slice(-100) : [] } catch { return [] }
}
export default function useGameAccount() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [queue, setQueue] = useState(readQueue)
  const [cloudMessage, setCloudMessage] = useState('')
  const [retry, setRetry] = useState(0)
  const round = useRef({ id: crypto.randomUUID(), userId: null })
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setAuthReady(true) } }).catch(() => { if (active) setAuthReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => { if (active) { setSession(value); setAuthReady(true) } })
    const online = () => setRetry(value => value + 1)
    window.addEventListener('online', online)
    return () => { active = false; subscription.unsubscribe(); window.removeEventListener('online', online) }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('assembly-cloud-outbox-v1', JSON.stringify(queue)) } catch { /* Current-session retries still work. */ }
  }, [queue])
  const playerId = session?.user.id
  useEffect(() => {
    const result = queue.find(row => row.userId === playerId)
    if (!result || !playerId) return
    let active = true
    supabase.rpc(result.type === 'challenge' ? 'record_challenge_result' : 'record_timed_game_result', result.type === 'challenge' ? { run_id: result.id, game_mode: result.mode, correct_count: result.correct, incorrect_count: result.incorrect, skipped_count: result.skipped, question_total: result.total, duration_ms: result.elapsedMs, finish_reason: result.reason } : { round_id: result.id, game_mode: result.mode, did_win: result.won, duration_ms: result.elapsedMs ?? null }).then(({ error }) => {
      if (!active) return
      if (error) setCloudMessage(onlineError(error))
      else { setCloudMessage('Leaderboard မှာ သိမ်းပြီးပါပြီ။'); setQueue(previous => previous.filter(row => row.id !== result.id)) }
    }).catch(error => { if (active) setCloudMessage(onlineError(error)) })
    return () => { active = false }
  }, [queue, playerId, retry])
  const startOnlineRound = (userId = playerId) => { round.current = { id: crypto.randomUUID(), userId: userId || null } }
  const saveOnlineResult = useCallback((mode, won, elapsedMs) => {
    if (!round.current.userId) return
    const result = { ...round.current, mode, won, elapsedMs }
    setCloudMessage('ရလဒ် သိမ်းနေပါတယ်…')
    setQueue(previous => previous.some(row => row.id === result.id) ? previous : [...previous, result])
  }, [])
  const saveChallengeResult = useCallback(result => {
    if (!result.userId) return
    setCloudMessage('ရလဒ် သိမ်းနေပါတယ်…')
    setQueue(previous => previous.some(row => row.id === result.id) ? previous : [...previous, { ...result, type: 'challenge' }])
  }, [])
  return { session, authReady, saveChallengeResult, startOnlineRound, saveOnlineResult, cloudMessage, retryCloud: () => setRetry(value => value + 1), pendingCloud: queue.some(row => row.userId === playerId) }
}
