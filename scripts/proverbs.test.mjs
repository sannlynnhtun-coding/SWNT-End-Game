import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { splitProverb, unspacedProverbPrefixes } from '../src/proverbSplit.js'

const rows = JSON.parse(readFileSync(new URL('../src/proverbs.json', import.meta.url), 'utf8'))

test('reported prompts preserve complete Myanmar words', () => {
  for (const [word, prefix, suffix] of [
    ['ကံမရှိ ဉာဏ်ရှိတိုင်းမွဲ', 'ကံမရှိ', 'ဉာဏ်ရှိတိုင်းမွဲ'],
    ['ကုသိုလ်ဖန် ဗိမာန်အသင့် ဘုံအသင့်', 'ကုသိုလ်ဖန်', 'ဗိမာန်အသင့် ဘုံအသင့်'],
    ['ခရုခါးတောင်းကျိုက်ဖမ်း', 'ခရုခါးတောင်းကျိုက်', 'ဖမ်း'],
    ['မပိုင်ဝက်မွေး', 'မပိုင်', 'ဝက်မွေး'],
  ]) assert.deepEqual(splitProverb(word), { word, prefix, suffix })
})

test('every source proverb has a complete answer and a source or reviewed word boundary', () => {
  for (const row of rows) {
    const { word, prefix, suffix, trailing } = splitProverb(row.ProverbName)
    assert.ok(prefix && suffix, `Missing split: ${word}`)
    const restored = [prefix, suffix, trailing].filter(Boolean).join(' ')
    assert.equal(restored.replaceAll(' ', ''), word.replaceAll(' ', ''), word)
    if (word.includes(' ')) assert.equal(restored, word)
    else assert.ok(unspacedProverbPrefixes.has(word), `Review new unspaced proverb: ${word}`)
    assert.ok(!/^[\p{Mark}\u1039\u103a]/u.test(suffix), word)
    assert.notEqual(prefix.split(' ').at(-1), suffix.split(' ')[0], `Repeated answer leaked: ${word}`)
  }
})

test('reported repeated call is hidden together with its verb left visible', () => {
  assert.deepEqual(splitProverb('သူခိုးက လူ လူ ဟစ်'), {
    word: 'သူခိုးက လူ လူ ဟစ်', prefix: 'သူခိုးက', suffix: 'လူ လူ', trailing: 'ဟစ်',
  })
})

test('automatic splits keep repeated expressions together', () => {
  const parts = splitProverb('အစ လူ လူ အဆုံး')
  assert.ok(parts.prefix.includes('လူ လူ') || parts.suffix.includes('လူ လူ'))
  assert.equal(`${parts.prefix} ${parts.suffix}`, parts.word)
})

test('unknown unspaced entries cannot produce broken puzzles', () => {
  assert.equal(splitProverb('စာလုံးအသစ်').suffix, '')
})
