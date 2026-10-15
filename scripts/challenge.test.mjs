import test from 'node:test'
import assert from 'node:assert/strict'
import { createChallenge, advanceChallenge, restoreChallenge } from '../src/challenge.js'
const ids = Array.from({ length: 869 }, (_, i) => String(i))
test('all 869 questions appear exactly once, with one completed run', () => {
  let run = createChallenge('proverb-choice', ids)
  assert.equal(new Set(run.deck).size, 869)
  const seen = []
  for (let i = 0; i < 869; i++) {
    seen.push(run.deck[run.index])
    run = advanceChallenge(run, { type: 'answer', kind: 'correct', delta: 1000 })
    if (i < 868) run = advanceChallenge(run, { type: 'next', delta: 9000 })
  }
  assert.equal(new Set(seen).size, 869)
  assert.equal(run.correct, 869)
  assert.equal(run.elapsedMs, 869000)
  assert.equal(run.phase, 'finished')
  assert.equal(run.reason, 'completed')
  assert.equal(run.lives, 3)
})
test('three shared lives, including skipped questions; duplicate answers cannot score twice', () => {
  let run = createChallenge('slang', ['a', 'b', 'c', 'd'])
  for (const kind of ['incorrect', 'skipped', 'incorrect']) {
    run = advanceChallenge(run, { type: 'answer', kind, delta: 2000 })
    const same = advanceChallenge(run, { type: 'answer', kind: 'correct', delta: 8000 })
    assert.deepEqual(same, run)
    run = advanceChallenge(run, { type: 'next' })
  }
  assert.equal(run.lives, 0)
  assert.equal(run.phase, 'finished')
  assert.equal(run.reason, 'lives')
  assert.equal(run.correct, 0)
  assert.equal(run.incorrect, 2)
  assert.equal(run.skipped, 1)
  assert.equal(run.elapsedMs, 6000)
})
test('pause and reading do not accumulate time; stopped runs freeze their scores', () => {
  let run = createChallenge('slang', ['a', 'b'])
  run = advanceChallenge(run, { type: 'pause', delta: 1200 })
  run = advanceChallenge(run, { type: 'tick', delta: 30000 })
  assert.equal(run.elapsedMs, 1200)
  run = advanceChallenge(run, { type: 'resume', delta: 10000 })
  run = advanceChallenge(run, { type: 'answer', kind: 'correct', delta: 500 })
  run = advanceChallenge(run, { type: 'tick', delta: 40000 })
  assert.equal(run.elapsedMs, 1700)
  run = advanceChallenge(run, { type: 'stop', delta: 40000 })
  assert.equal(run.reason, 'stopped')
  assert.equal(run.elapsedMs, 1700)
  assert.deepEqual(advanceChallenge(run, { type: 'next' }), run)
})
test('resume validates dataset, owner and counters, and restores into paused state', () => {
  const run = createChallenge('slang', ['a', 'b'], 'player')
  assert.equal(restoreChallenge(run, 'slang', ['a', 'b'], 'player').phase, 'paused')
  assert.equal(restoreChallenge(run, 'slang', ['a', 'b'], 'other'), null)
  assert.equal(restoreChallenge(run, 'slang', ['a'], 'player'), null)
  assert.equal(restoreChallenge({ ...run, lives: 9 }, 'slang', ['a', 'b'], 'player'), null)
})

import { mergeChallengeSnapshot, acknowledgeResult } from '../src/challengeOutbox.js'
test('queued paused snapshots advance without duplicates and stale acknowledgements preserve newer results', () => {
  const base = { id: 'run', correct: 2, incorrect: 0, skipped: 0, elapsedMs: 4000, reason: 'paused' }
  let queue = mergeChallengeSnapshot([], base)
  const old = queue[0]
  queue = mergeChallengeSnapshot(queue, { ...base, correct: 5, elapsedMs: 10000 })
  assert.equal(queue.length, 1)
  assert.equal(acknowledgeResult(queue, old).length, 1)
  queue = mergeChallengeSnapshot(queue, base)
  assert.equal(queue[0].correct, 5)
  queue = mergeChallengeSnapshot(queue, { ...base, correct: 6, elapsedMs: 12000, reason: 'stopped' })
  queue = mergeChallengeSnapshot(queue, { ...base, correct: 7, elapsedMs: 15000 })
  assert.equal(queue[0].reason, 'stopped')
  assert.equal(acknowledgeResult(queue, queue[0]).length, 0)
})
