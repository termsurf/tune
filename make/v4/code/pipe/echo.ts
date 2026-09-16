/**
 * How much a Tune word sounds like the English it means.
 *
 * This is the FIRST half of the ordering rule in
 * `note/tune/pipeline/philosophy.md`:
 *
 *   I love having them sound like english words if they can, but if
 *   not, then mapping them to the experiential vibe of the components
 *   and their possible diverse array of meanings.
 *
 * It is a priority, not a weight, so the score treats a strong echo as
 * a threshold rather than as something tradeable. See `score.ts`.
 *
 * ## What this can and cannot do
 *
 * English spelling is not English sound, and the honest way to read a
 * pronunciation is a dictionary. CMUdict lives on the NAS, which this
 * package does not reach, so this is a RULE-BASED approximation of
 * English spelling and it will be wrong on the irregular words. It is
 * good enough to RANK, which is all the search needs, and it is
 * deterministic, which the house rule requires.
 *
 * `list` scores 1. `tem` against `ten` scores high. `mix` against
 * `network` scores near nothing. Those are the judgments that matter.
 */

import { isVowel } from '../sound'
import { soundGap } from './tone'

// ─── English spelling to Tune sounds ────────────────────

/** Digraphs first, because `th` is one sound and `t` plus `h` is two. */
const DIGRAPH: Array<[string, string]> = [
  ['tch', 'tx'],
  ['sch', 'sk'],
  ['th', 'c'],
  ['sh', 'x'],
  ['ch', 'tx'],
  ['ng', 'q'],
  ['ph', 'f'],
  ['gh', ''],
  ['ck', 'k'],
  ['qu', 'kw'],
  ['wh', 'w'],
  ['kn', 'n'],
  ['wr', 'r'],
  ['dg', 'dj'],
  ['ee', 'i'],
  ['ea', 'i'],
  ['oo', 'u'],
  ['ou', 'au'],
  ['ow', 'au'],
  ['ai', 'e'],
  ['ay', 'e'],
  ['oa', 'o'],
  ['oi', 'oi'],
  ['oy', 'oi'],
  ['ie', 'i'],
  ['ei', 'i'],
]

const SINGLE: Record<string, string> = {
  a: 'a',
  b: 'b',
  c: 'k',
  d: 'd',
  e: 'e',
  f: 'f',
  g: 'g',
  h: 'h',
  i: 'i',
  j: 'dj',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'o',
  p: 'p',
  q: 'k',
  r: 'r',
  s: 's',
  t: 't',
  u: 'u',
  v: 'v',
  w: 'w',
  x: 'ks',
  y: 'y',
  z: 'z',
}

/**
 * One English word as an approximate run of Tune sounds.
 *
 * Two rules beyond the tables, both of which matter often enough to
 * earn their place: a soft `c` before `e i y` is `s`, and a silent
 * final `e` is dropped.
 */
export function englishSounds(word: string): Array<string> {
  let text = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!text) {
    return []
  }
  // A silent final `e`, as in `time`, `have`, `rule`.
  if (text.length > 2 && text.endsWith('e') && !isVowelLetter(text[text.length - 2])) {
    text = text.slice(0, -1)
  }
  const out: Array<string> = []
  let i = 0
  while (i < text.length) {
    let hit = false
    for (const [from, to] of DIGRAPH) {
      if (text.startsWith(from, i)) {
        out.push(...to.split(''))
        i += from.length
        hit = true
        break
      }
    }
    if (hit) continue
    const ch = text[i]
    if (ch === 'c') {
      const next = text[i + 1]
      out.push(next === 'e' || next === 'i' || next === 'y' ? 's' : 'k')
    } else {
      out.push(...(SINGLE[ch] ?? '').split(''))
    }
    i++
  }
  return out
}

function isVowelLetter(ch: string): boolean {
  return 'aeiou'.includes(ch)
}

// ─── Comparing the two ──────────────────────────────────

/**
 * Normalised edit distance where a substitution costs what the two
 * sounds actually differ by, rather than a flat 1. So `tem` against
 * `ten` pays only the small `m`/`n` gap, and `tem` against `bek` pays
 * nearly the whole word.
 */
function soundEdit(a: Array<string>, b: Array<string>): number {
  if (a.length === 0 && b.length === 0) {
    return 0
  }
  const rows = a.length + 1
  const cols = b.length + 1
  let prev = new Float64Array(cols)
  let next = new Float64Array(cols)
  for (let j = 0; j < cols; j++) {
    prev[j] = j
  }
  for (let i = 1; i < rows; i++) {
    next[0] = i
    for (let j = 1; j < cols; j++) {
      const sub = prev[j - 1] + soundGap(a[i - 1], b[j - 1])
      const del = prev[j] + 1
      const ins = next[j - 1] + 1
      next[j] = Math.min(sub, del, ins)
    }
    const swap = prev
    prev = next
    next = swap
  }
  return prev[cols - 1] / Math.max(a.length, b.length)
}

/**
 * The parts of a gloss worth comparing against.
 *
 * Stop words are dropped so `one who does it` is compared on `does`
 * rather than on `one` and `who`. **But a gloss that is ONLY stop words
 * keeps them**, because `and`, `of`, `in` and `with` are real concepts
 * with real words, and stripping them left nothing to compare and scored
 * every function word in the language at zero. They then filled the
 * worst-words list while never having been measured at all.
 */
export function glossWords(meaning: string): Array<string> {
  const all = meaning
    .replace(/\([^)]*\)/g, ' ')
    .split(/[^A-Za-z-]+/)
    .map(w => w.trim())
    .filter(Boolean)

  const meaty = all.filter(w => w.length > 1 && !STOP.has(w.toLowerCase()))
  return meaty.length > 0 ? meaty : all
}

const STOP = new Set([
  'the',
  'a',
  'an',
  'of',
  'to',
  'in',
  'on',
  'for',
  'and',
  'or',
  'is',
  'it',
  'as',
  'by',
  'with',
  'one',
  'who',
  'that',
  'this',
  'be',
])

/**
 * How strongly a Tune word echoes its meaning, from 0 to 1.
 *
 * A gloss of several words scores as its BEST word, because `map
 * (map/reduce)` echoes through `map` and the rest is commentary. A gloss
 * with no usable word scores 0, which is the same as no echo, and the
 * caller must not read that as a bad word: it means the vibe half of the
 * ordering rule is the one that applies.
 */
export function echoScore(word: string, meaning: string): number {
  const mine = word.split('')
  let best = 0
  for (const gloss of glossWords(meaning)) {
    const theirs = englishSounds(gloss)
    if (theirs.length === 0) continue
    const score = 1 - soundEdit(mine, theirs)
    if (score > best) {
      best = score
    }
  }
  return Math.max(0, best)
}

/** An echo this strong is treated as decisive rather than tradeable. */
export const ECHO_STRONG = 0.72

export { isVowel }
