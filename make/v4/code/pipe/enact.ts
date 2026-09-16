/**
 * Does the word ENACT the thing, across its own length?
 *
 * Stated 2026-09-15:
 *
 *   for breath, breath starts from stopped position, to airy position,
 *   so going like english, b -> c, is good think, simulating the object
 *   or action.
 *
 *   it could also go from breathy sounds like chsx/etc., to q or n or m
 *   perhaps, or to another breathy sound.
 *
 * ## Why this is not sound symbolism
 *
 * `vibe.ts` reads each sound for what it means and averages them. **That
 * throws the ORDER away**, and the order is the whole content here. `bic`
 * and `cib` hold the same three sounds and only one of them is a breath:
 * the mouth closes, then releases into air. The word performs the act.
 *
 * So this is a separate term over the same words, and it is the one that
 * can see what the averaging cannot.
 *
 * ## The scale
 *
 * How open the vocal tract is for each consonant.
 *
 * ```text
 * 0  stop          b d g p t k       shut
 * 1  nasal         m n q             shut at the mouth, open at the nose
 * 2  fricative     f v s z x j c C h narrowed, audible air
 * 3  approximant   w l r y           open, barely shaped
 * ```
 *
 * A word's trace is what the closing consonant does relative to the
 * opening one, and whether the air is still moving at the end.
 */

import { CONSONANT_FEATURE } from './tone'
import { isVowel } from '../sound'

export const OPENNESS: Record<string, number> = {}
for (const [sound, feature] of Object.entries(CONSONANT_FEATURE)) {
  OPENNESS[sound] =
    feature.manner === 'stop'
      ? 0
      : feature.manner === 'nasal'
        ? 1
        : feature.manner === 'fricative'
          ? 2
          : 3
}

/** A consonant the air keeps moving through. Everything but a stop. */
export function isContinuant(sound: string): boolean {
  return (OPENNESS[sound] ?? 0) > 0
}

function openingOf(word: string): string {
  return word[0]
}

function closingOf(word: string): string {
  return word[word.length - 1]
}

/**
 * What the word does, from -1 (shuts) through 0 (holds) to +1 (opens).
 *
 * **Two parts, and the second matters more.**
 *
 *   does it END with the air still moving   weight 0.7
 *   does it OPEN as it goes                 weight 0.3
 *
 * That ordering is what the second half of the instruction asks for.
 * `b -> c` opens from a stop into air and scores well on both. `x -> q`
 * scores well on the first and slightly against on the second, and it
 * was named as good anyway, so continuancy has to be the larger term.
 * `b -> p` shuts at both ends and is not a breath under either.
 */
export function traceOf(word: string): number {
  const open = openingOf(word)
  const close = closingOf(word)
  if (isVowel(open) || isVowel(close)) {
    return 0
  }
  const from = OPENNESS[open] ?? 0
  const to = OPENNESS[close] ?? 0
  const ends = (to > 0 ? 1 : -1) * 0.7
  const moves = Math.max(-1, Math.min(1, (to - from) / 3)) * 0.3
  return Math.max(-1, Math.min(1, ends + moves))
}

/**
 * How badly a word fails to enact its concept, 0 to 1.
 *
 * `want` is +1 for a thing that opens or releases, -1 for a thing that
 * shuts or holds, and absent for a concept that is not an act with a
 * direction, which is most of them.
 */
export function enactLoss(word: string, want: number | null): number {
  if (want === null || want === 0) {
    return 0
  }
  return Math.abs(want - traceOf(word)) / 2
}

/**
 * Concepts whose word should open, and concepts whose word should shut.
 *
 * Kept short and literal. **A concept only belongs here if the thing
 * itself has a direction in the mouth**, and most do not. Guessing
 * widely would penalise words for failing to enact something their
 * concept never claimed.
 */
const OPENS =
  `breath breathe air wind blow exhale emit release express emanate
   expose reveal open out outside exit escape leave burst bloom spread
   scatter pour flow stream spray shout speak sing call cry laugh
   expand grow rise flee send give`.split(/\s+/)

const SHUTS =
  `stop halt end close shut contain hold catch grip seize keep block
   trap seal bind lock clamp bite chew crush press squeeze stick stop
   arrive land settle rest sleep die finish`.split(/\s+/)

const WANT = new Map<string, number>()
for (const word of OPENS) {
  if (word) WANT.set(word, 1)
}
for (const word of SHUTS) {
  if (word) WANT.set(word, -1)
}

/** The trajectory a concept asks for, or null when it asks for none. */
export function wantOf(meaning: string): number | null {
  const words = meaning
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  for (const word of words) {
    const want = WANT.get(word)
    if (want !== undefined) {
      return want
    }
  }
  return null
}

export function enactOf(word: string, meaning: string): number {
  return enactLoss(word, wantOf(meaning))
}

/** Whether a concept says anything this term can read. */
export function enacts(meaning: string): boolean {
  return wantOf(meaning) !== null
}
