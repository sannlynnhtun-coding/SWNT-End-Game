const segmenter = new Intl.Segmenter('my', { granularity: 'grapheme' })

// Keep the repeated call together; the verb remains visible as context.
const reviewedBlanks = new Map([
  ['သူခိုးက လူ လူ ဟစ်', { prefix: 'သူခိုးက', suffix: 'လူ လူ', trailing: 'ဟစ်' }],
])

// These source entries have no spaces; keep their word boundaries explicit.
export const unspacedProverbPrefixes = new Map([
  ['ခရုခါးတောင်းကျိုက်ဖမ်း', 'ခရုခါးတောင်းကျိုက်'],
  ['ဆင်ကန်းတောတိုး', 'ဆင်ကန်း'],
  ['မပိုင်ဝက်မွေး', 'မပိုင်'],
  ['မျောက်သစ်ကိုင်းလွတ်', 'မျောက်သစ်ကိုင်း'],
])

export function splitProverb(value) {
  const word = value.trim().replace(/\s+/g, ' ')
  const reviewed = reviewedBlanks.get(word)
  if (reviewed) return { word, ...reviewed }
  const prefix = unspacedProverbPrefixes.get(word)
  if (prefix) return { word, prefix, suffix: word.slice(prefix.length) }

  const units = [...segmenter.segment(word)].map(item => item.segment)
  const midpoint = units.length / 2
  const spaces = units.flatMap((unit, index) => {
    if (unit !== ' ') return []
    const before = units.slice(0, index).join('').split(' ').at(-1)
    const after = units.slice(index + 1).join('').split(' ')[0]
    // A repeated expression is one answer unit, never half prompt/half answer.
    return before === after ? [] : [index]
  })
  // Unreviewed entries without spaces stay out of the puzzle pool until a
  // word boundary is supplied above. Grapheme boundaries can split syllables.
  if (!spaces.length) return { word, prefix: word, suffix: '' }
  const cut = spaces.reduce((a, b) => Math.abs(a - midpoint) <= Math.abs(b - midpoint) ? a : b)
  return { word, prefix: units.slice(0, cut).join(''), suffix: units.slice(cut).join('').trim() }
}
