export function formatTime(milliseconds) {
  if (milliseconds == null) return '—'
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.${Math.floor(milliseconds % 1000 / 100)}`
}
