/**
 * The sounds as features, and the two distances between them.
 *
 * Tune has TWO confusion channels and this file holds both. A word can
 * be misheard, and a word can be misread, and the two are independent:
 *
 *   HEARD   articulatory distance, from place, manner and voice
 *   READ    the eight mirror pairs of the tone script
 *
 * The read channel is exact. `note/tune/pipeline/fitness.md` argues why
 * that matters and why the two pull against each other on the words
 * that are most wanted.
 *
 * Everything here is a property of the INVENTORY, so it is computed
 * once and never changes as the lexicon moves. That is what makes the
 * search affordable.
 */

import { CONSONANTS, SOUNDS, VOWELS, isVowel } from '../sound'

// ─── Consonant features ─────────────────────────────────

type Place =
  | 'labial'
  | 'dental'
  | 'alveolar'
  | 'postalveolar'
  | 'palatal'
  | 'velar'
  | 'glottal'

type Manner = 'stop' | 'nasal' | 'fricative' | 'approximant'

type Consonant = {
  place: Place
  manner: Manner
  voiced: boolean
}

/**
 * Place, manner and voice for all 22. The values are the ordinary IPA
 * ones for the sounds `code/phonology` names, so this table is checkable
 * against any reference rather than being a private opinion.
 */
export const CONSONANT_FEATURE: Record<string, Consonant> = {
  m: { place: 'labial', manner: 'nasal', voiced: true },
  n: { place: 'alveolar', manner: 'nasal', voiced: true },
  q: { place: 'velar', manner: 'nasal', voiced: true },
  g: { place: 'velar', manner: 'stop', voiced: true },
  d: { place: 'alveolar', manner: 'stop', voiced: true },
  b: { place: 'labial', manner: 'stop', voiced: true },
  p: { place: 'labial', manner: 'stop', voiced: false },
  t: { place: 'alveolar', manner: 'stop', voiced: false },
  k: { place: 'velar', manner: 'stop', voiced: false },
  h: { place: 'glottal', manner: 'fricative', voiced: false },
  s: { place: 'alveolar', manner: 'fricative', voiced: false },
  f: { place: 'labial', manner: 'fricative', voiced: false },
  v: { place: 'labial', manner: 'fricative', voiced: true },
  z: { place: 'alveolar', manner: 'fricative', voiced: true },
  j: { place: 'postalveolar', manner: 'fricative', voiced: true },
  x: { place: 'postalveolar', manner: 'fricative', voiced: false },
  c: { place: 'dental', manner: 'fricative', voiced: false },
  C: { place: 'dental', manner: 'fricative', voiced: true },
  w: { place: 'labial', manner: 'approximant', voiced: true },
  l: { place: 'alveolar', manner: 'approximant', voiced: true },
  r: { place: 'alveolar', manner: 'approximant', voiced: true },
  y: { place: 'palatal', manner: 'approximant', voiced: true },
}

/** How far apart two places of articulation sit, front to back. */
const PLACE_ORDER: Array<Place> = [
  'labial',
  'dental',
  'alveolar',
  'postalveolar',
  'palatal',
  'velar',
  'glottal',
]

const PLACE_AT = new Map(PLACE_ORDER.map((p, i) => [p, i]))

/**
 * Manner distance is not a line. A nasal and a stop share everything but
 * the velum, so they are near. An approximant and a stop are far.
 */
const MANNER_GAP: Record<string, number> = {
  'stop|stop': 0,
  'stop|nasal': 0.4,
  'stop|fricative': 0.6,
  'stop|approximant': 1,
  'nasal|nasal': 0,
  'nasal|fricative': 0.7,
  'nasal|approximant': 0.7,
  'fricative|fricative': 0,
  'fricative|approximant': 0.6,
  'approximant|approximant': 0,
}

function mannerGap(a: Manner, b: Manner): number {
  return MANNER_GAP[`${a}|${b}`] ?? MANNER_GAP[`${b}|${a}`] ?? 1
}

// ─── Vowel features ─────────────────────────────────────

type Vowel = { high: number; back: number; round: number }

/**
 * The five on the cross, as coordinates. `i` up, `u` down, `e` left,
 * `o` right, `a` at the centre, which is `note/tune/pipeline/
 * philosophy.md` principle 6 written as numbers.
 */
export const VOWEL_FEATURE: Record<string, Vowel> = {
  i: { high: 1, back: 0, round: 0 },
  e: { high: 0.5, back: 0, round: 0 },
  a: { high: 0, back: 0.5, round: 0 },
  o: { high: 0.5, back: 1, round: 1 },
  u: { high: 1, back: 1, round: 1 },
}

// ─── The heard channel ──────────────────────────────────

/**
 * How near two sounds are in the ear, from 0 (the same) to 1 (nothing
 * in common). A vowel and a consonant are always 1, because no amount of
 * noise turns one into the other.
 */
export function soundGap(a: string, b: string): number {
  if (a === b) {
    return 0
  }
  const aVowel = isVowel(a)
  if (aVowel !== isVowel(b)) {
    return 1
  }
  if (aVowel) {
    const x = VOWEL_FEATURE[a]
    const y = VOWEL_FEATURE[b]
    if (!x || !y) return 1
    const gap =
      Math.abs(x.high - y.high) * 0.45 +
      Math.abs(x.back - y.back) * 0.45 +
      Math.abs(x.round - y.round) * 0.1
    return Math.min(1, gap)
  }
  const x = CONSONANT_FEATURE[a]
  const y = CONSONANT_FEATURE[b]
  if (!x || !y) return 1
  const place =
    Math.abs(
      (PLACE_AT.get(x.place) ?? 0) - (PLACE_AT.get(y.place) ?? 0),
    ) /
    (PLACE_ORDER.length - 1)
  const manner = mannerGap(x.manner, y.manner)
  const voice = x.voiced === y.voiced ? 0 : 1
  return Math.min(1, place * 0.4 + manner * 0.45 + voice * 0.15)
}

// ─── The read channel ───────────────────────────────────

/**
 * The eight mirror pairs. A glyph and its mirror are the maximally
 * confusable pair in the eye, the way `b` and `d` are in Latin script,
 * and here it is by design rather than by accident.
 *
 * The six left over are `f x c C r y`, which mirror nothing.
 */
export const MIRROR_PAIRS = [
  ['s', 'z'],
  ['n', 'q'],
  ['d', 'b'],
  ['p', 'k'],
  ['t', 'v'],
  ['j', 'l'],
  ['h', 'm'],
  ['w', 'g'],
]

export const MIRROR_OF = new Map<string, string>()
for (const [a, b] of MIRROR_PAIRS) {
  MIRROR_OF.set(a, b)
  MIRROR_OF.set(b, a)
}

/**
 * How near two sounds are on the page. Only three values, because the
 * script only offers three: the same glyph, its mirror, or a different
 * glyph entirely.
 */
export function glyphGap(a: string, b: string): number {
  if (a === b) {
    return 0
  }
  if (MIRROR_OF.get(a) === b) {
    return 0.25
  }
  return 1
}

// ─── Word distance ──────────────────────────────────────

/**
 * Distance between two words on one channel, from 0 to 1.
 *
 * Words of different shapes are held apart by the shape itself, so they
 * start from a floor rather than being compared position by position.
 * Two words of the same shape are the mean of their sound gaps, with the
 * VOWEL WEIGHTED LOWEST: a vowel carries less of a word's identity than
 * the frame of consonants around it, which is why `bat` and `bet` are
 * closer than `bat` and `mat`.
 */
function wordGap(
  a: string,
  b: string,
  gap: (x: string, y: string) => number,
): number {
  if (a === b) {
    return 0
  }
  if (a.length !== b.length) {
    return 1
  }
  let total = 0
  let weight = 0
  for (let i = 0; i < a.length; i++) {
    const w = isVowel(a[i]) && isVowel(b[i]) ? 0.6 : 1
    total += gap(a[i], b[i]) * w
    weight += w
  }
  const raw = total / weight
  // Different shapes of the same length still differ structurally.
  return Math.min(1, raw)
}

export function heardGap(a: string, b: string): number {
  return wordGap(a, b, soundGap)
}

export function readGap(a: string, b: string): number {
  return wordGap(a, b, glyphGap)
}

// ─── The sound profile ──────────────────────────────────

/** Every sound in a word, for counting how often the language uses it. */
export function soundsIn(word: string): Array<string> {
  return word.split('')
}

export const ALL_SOUNDS = SOUNDS
export const ALL_CONSONANTS = CONSONANTS
export const ALL_VOWELS = VOWELS
