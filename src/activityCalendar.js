export function activityCalendar(today, entries) {
  const end = new Date(`${today}T00:00:00Z`)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 364)
  const counts = new Map(entries.map(item => [item.date, Number(item.count)]))
  const days = Array.from({ length: start.getUTCDay() }, () => null)
  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10)
    days.push({ date, count: counts.get(date) || 0 })
  }
  while (days.length % 7) days.push(null)
  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}
export function activityLevel(count) { return count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4 }
