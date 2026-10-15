export function shuffleDeck(ids, random = Math.random) {
  const deck = [...new Set(ids)]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}
export function createChallenge(mode, ids, userId = null) {
  return { version: 1, id: crypto.randomUUID(), mode, userId, deck: shuffleDeck(ids), index: 0,
    correct: 0, incorrect: 0, skipped: 0, lives: 3, elapsedMs: 0, phase: 'question',
    lastAnswer: null, reason: null, draft: '', hintUsed: false }
}
export function advanceChallenge(state, action) {
  if (state.phase === 'finished') return state
  const next = { ...state }
  if (state.phase === 'question') next.elapsedMs += Math.max(0, Math.round(action.delta || 0))
  if (action.type === 'tick') return next
  if (action.type === 'pause' && state.phase === 'question') return { ...next, phase: 'paused' }
  if (action.type === 'resume' && state.phase === 'paused') return { ...next, phase: 'question' }
  if (action.type === 'stop') return { ...next, phase: 'finished', reason: 'stopped' }
  if (action.type === 'draft') return { ...next, draft: action.value }
  if (action.type === 'hint' && state.phase === 'question') return { ...next, hintUsed: true }
  if (action.type === 'answer' && state.phase === 'question') {
    const kind = action.kind
    if (!['correct', 'incorrect', 'skipped'].includes(kind)) return next
    next[kind]++
    if (kind !== 'correct') next.lives--
    next.lastAnswer = kind
    next.phase = 'reading'
    if (next.lives === 0 || next.correct + next.incorrect + next.skipped === next.deck.length) {
      next.phase = 'finished'
      next.reason = next.lives === 0 ? 'lives' : 'completed'
    }
    return next
  }
  if (action.type === 'next' && state.phase === 'reading') {
    return { ...next, index: state.index + 1, phase: 'question', lastAnswer: null, draft: '', hintUsed: false }
  }
  return next
}
export function restoreChallenge(value, mode, ids, userId) {
  if (!value || value.version !== 1 || value.mode !== mode || value.userId !== userId || !Array.isArray(value.deck)) return null
  const valid = new Set(ids)
  if (value.deck.length !== valid.size || new Set(value.deck).size !== valid.size || !value.deck.every(id => valid.has(id))) return null
  const integers = ['index', 'correct', 'incorrect', 'skipped', 'lives', 'elapsedMs']
  if (!integers.every(key => Number.isSafeInteger(value[key]) && value[key] >= 0)) return null
  const answered = value.correct + value.incorrect + value.skipped
  if (value.index >= value.deck.length || value.lives !== 3 - value.incorrect - value.skipped || value.lives > 3 || answered > valid.size || value.elapsedMs > 2147483647) return null
  if (!['question', 'paused', 'reading', 'finished'].includes(value.phase)) return null
  if ((['question', 'paused'].includes(value.phase) && answered !== value.index) || (value.phase === 'reading' && answered !== value.index + 1)) return null
  if (value.phase !== 'finished' && value.lives === 0) return null
  if (typeof value.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value.id) || typeof value.draft !== 'string') return null
  if (value.phase === 'finished' && !['completed', 'stopped', 'lives'].includes(value.reason)) return null
  if (value.phase === 'finished' && value.reason === 'completed' && answered !== valid.size) return null
  if (value.phase === 'finished' && value.reason === 'lives' && value.lives !== 0) return null
  return { ...value, phase: value.phase === 'question' ? 'paused' : value.phase }
}
