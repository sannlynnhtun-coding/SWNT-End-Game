export function mergeChallengeSnapshot(queue, result) {
  const existing = queue.find(row => row.id === result.id)
  if (existing && (existing.reason !== 'paused' || result.correct < existing.correct || result.incorrect < existing.incorrect || result.skipped < existing.skipped || result.elapsedMs < existing.elapsedMs)) return queue
  const entry = { ...result, type: 'challenge', queueId: crypto.randomUUID() }
  return existing ? queue.map(row => row.id === result.id ? entry : row) : [...queue, entry]
}
export function acknowledgeResult(queue, result) {
  return queue.filter(row => row.id !== result.id || row.queueId !== result.queueId)
}
