const segmenter = new Intl.Segmenter('my', { granularity: 'grapheme' })

// These source entries have no spaces; keep their word boundaries explicit.
export const unspacedProverbPrefixes = new Map([
  ['ခရုခါးတောင်းကျိုက်ဖမ်း', 'ခရုခါးတောင်းကျိုက်'],
  ['ဆင်ကန်းတောတိုး', 'ဆင်ကန်း'],
  ['မပိုင်ဝက်မွေး', 'မပိုင်'],
  ['မျောက်သစ်ကိုင်းလွတ်', 'မျောက်သစ်ကိုင်း'],
])

export function splitProverb(value) {
  const word = value.trim().replace(/\s+/g, ' ')
  const prefix = unspacedProverbPrefixes.get(word)
  if (prefix) return { word, prefix, suffix: word.slice(prefix.length) }

  const units = [...segmenter.segment(word)].map(item => item.segment)
  const midpoint = units.length / 2
  const spaces = units.flatMap((unit, index) => unit === ' ' ? [index] : [])
  // Unreviewed entries without spaces stay out of the puzzle pool until a
  // word boundary is supplied above. Grapheme boundaries can split syllables.
  if (!spaces.length) return { word, prefix: word, suffix: '' }
  const cut = spaces.reduce((a, b) => Math.abs(a - midpoint) <= Math.abs(b - midpoint) ? a : b)
  return { word, prefix: units.slice(0, cut).join(''), suffix: units.slice(cut).join('').trim() }
}
