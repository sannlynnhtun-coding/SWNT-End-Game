import test from 'node:test'
import assert from 'node:assert/strict'
import { activityCalendar, activityLevel } from '../src/activityCalendar.js'
test('calendar covers exactly 365 days with correct weekday alignment and no future cells', () => {
  for (const today of ['2026-10-16','2024-03-01','2026-01-01']) {
    const weeks = activityCalendar(today, [{ date: today, count: 12 }])
    const days = weeks.flat().filter(Boolean)
    assert.equal(days.length, 365)
    assert.equal(days.at(-1).date, today)
    assert.equal(days.at(-1).count, 12)
    assert.equal(new Set(days.map(day => day.date)).size, 365)
    for (const week of weeks) {
      assert.equal(week.length, 7)
      week.forEach((day, weekday) => { if (day) assert.equal(new Date(`${day.date}T00:00:00Z`).getUTCDay(), weekday) })
    }
  }
})
test('heat levels distinguish empty days from increasing activity', () => {
  assert.deepEqual([0,1,2,3,5,6,9,10,100].map(activityLevel), [0,1,1,2,2,3,3,4,4])
})
