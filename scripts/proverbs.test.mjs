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
    const { word, prefix, suffix } = splitProverb(row.ProverbName)
    assert.ok(prefix && suffix, `Missing split: ${word}`)
    assert.equal((prefix + suffix).replaceAll(' ', ''), word.replaceAll(' ', ''), word)
    if (word.includes(' ')) assert.equal(`${prefix} ${suffix}`, word)
    else assert.ok(unspacedProverbPrefixes.has(word), `Review new unspaced proverb: ${word}`)
    assert.ok(!/^[\p{Mark}\u1039\u103a]/u.test(suffix), word)
  }
})

test('unknown unspaced entries cannot produce broken puzzles', () => {
  assert.equal(splitProverb('စာလုံးအသစ်').suffix, '')
})
