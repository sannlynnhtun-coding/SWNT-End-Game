import test from 'node:test'
import assert from 'node:assert/strict'
import { categories, difficulties, drawPuzzle } from '../src/gameData.js'

test('all 240 English clues describe rather than name their own answer', () => {
  let count = 0
  for (const category of categories) {
    for (const difficulty of difficulties) {
      const pool = category.words.filter(item => item.difficulty === difficulty.id)
      assert.equal(pool.length, 20, `${category.id}:${difficulty.id}`)
      assert.equal(new Set(pool.map(item => item.word)).size, pool.length)
      for (const item of pool) {
        count++
        const label = `${category.id}:${difficulty.id}:${item.word}`
        assert.match(item.word, /^[a-z]+$/, label)
        assert.ok(item.clue.trim() && item.meaning.trim(), label)
        assert.doesNotMatch(item.clue, new RegExp(`\\b${item.word}\\b`, 'i'), label)
        // Check each supplied meaning separately, including comma-separated variants.
        for (const meaning of item.meaning.split(/[၊,]/).map(value => value.trim()).filter(Boolean)) {
          assert.ok(!item.clue.includes(meaning), `${label} gives away ${meaning}`)
        }
        assert.doesNotMatch(item.clue, /(?:ခေါ်တဲ့|ခေါ်သော).*English|အမည်အပြည့်အစုံ|ပိုရှည်သော English/, label)
      }
    }
  }
  assert.equal(count, 240)
})

test('each difficulty draws its full pool without repeating or changing answers', () => {
  for (const category of categories) for (const difficulty of difficulties) {
    let history = {}
    let previous = ''
    const seen = new Set()
    for (let index = 0; index < 20; index++) {
      const result = drawPuzzle(category.id, difficulty.id, history, previous)
      assert.equal(result.puzzle.difficulty, difficulty.id)
      assert.ok(!seen.has(result.puzzle.word))
      assert.ok(category.words.includes(result.puzzle))
      seen.add(result.puzzle.word)
      history = result.history
      previous = result.puzzle.word
    }
    assert.notEqual(drawPuzzle(category.id, difficulty.id, history, previous).puzzle.word, previous)
  }
})
