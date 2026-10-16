import rows from './proverbs.json'
import { normalizeSlang } from './slangData'
import { splitProverb } from './proverbSplit.js'
export { splitProverb } from './proverbSplit.js'

export const proverbCredit = 'မြန်မာစကားပုံများကို ဆရာ ဒေါက်တာ ၀င်းသိန်း Website မှ ယူသုံးထားတာဖြစ်ပါတယ်'

const segmenter = new Intl.Segmenter('my', { granularity: 'grapheme' })
const seen = new Set()
export const proverbs = rows.flatMap(row => {
  const parts = splitProverb(row.ProverbName)
  const key = normalizeSlang(parts.word)
  if (!parts.prefix || !parts.suffix || seen.has(key)) return []
  seen.add(key)
  return [{ ...parts, meaning: row.ProverbDesp, id: `${row.TitleId}:${row.ProverbId}`, hint: [...segmenter.segment(parts.suffix)][0].segment }]
})
export const proverbCount = proverbs.length
export function isProverbAnswer(puzzle, value) {
  return normalizeSlang(value) === normalizeSlang(puzzle.suffix)
}
function shuffle(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
export function drawProverb(history = {}, previous = '') {
  const key = 'proverb:my'
  let used = Array.isArray(history[key]) ? history[key].filter(id => proverbs.some(item => item.id === id)) : []
  let pool = proverbs.filter(item => !used.includes(item.id))
  if (!pool.length) { used = []; pool = proverbs.filter(item => item.word !== previous) }
  const selected = pool[Math.floor(Math.random() * pool.length)]
  return { puzzle: makeProverbPuzzle(selected), history: { ...history, [key]: [...used, selected.id] } }
}

export function makeProverbPuzzle(selected) {
  const endings = new Map(proverbs.filter(item => normalizeSlang(item.suffix) !== normalizeSlang(selected.suffix) && normalizeSlang(item.prefix) !== normalizeSlang(selected.prefix)).map(item => [normalizeSlang(item.suffix), item.suffix]))
  const options = shuffle([selected.suffix, ...shuffle([...endings.values()]).slice(0, 3)])
  return { ...selected, options }
}
