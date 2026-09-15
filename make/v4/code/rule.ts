/**
 * The catalogue of position rules a plan may take on.
 *
 * Each one is a sentence somebody could say about the language, not a
 * knob turned to hit a number. They all work the same way: a family of
 * sounds is refused at ONE slot of ONE shape, which thins that shape
 * while leaving the family free everywhere else. So the inventory never
 * shrinks and every sound still reaches a word.
 *
 *   "CVC never opens on a hush"     takes a quarter off CVC, and x j c C
 *                                   still open a CVCC and close anything
 *
 * The families below are the ones Tune already groups its sounds into,
 * so a rule names a natural class rather than a list somebody chose.
 */

import type { Bar, Ration } from './plan'
import type { Shape } from './sound'

// ─── Natural Classes ────────────────────────────────────

export const HUSH = ['x', 'j']
export const TEETH = ['c', 'C']
export const MARKED = [...HUSH, ...TEETH]
export const GLIDE = ['w', 'y']
export const LIQUID = ['l', 'r']
export const NASAL = ['m', 'n', 'q']
export const VOICED_STOP = ['b', 'd', 'g']
export const VOICELESS_STOP = ['p', 't', 'k']
export const STOP = [...VOICED_STOP, ...VOICELESS_STOP]
export const RUB = ['s', 'z', 'f', 'v', ...HUSH, ...TEETH]
export const BREATH = ['h']

// ─── The Rules ──────────────────────────────────────────

export type Rule = {
  name: string
  says: string
  bar: Bar
}

export const RULES: Array<Rule> = [
  {
    name: 'cvc_opens_plain',
    says: 'a three letter word never opens on a hush or a tooth sound',
    bar: { shape: 'CVC', at: 0, sounds: MARKED, note: 'marked opening' },
  },
  {
    name: 'cvc_closes_plain',
    says: 'a three letter word never closes on a hush or a tooth sound',
    bar: { shape: 'CVC', at: 2, sounds: MARKED, note: 'marked closing' },
  },
  {
    name: 'cvc_opens_steady',
    says: 'a three letter word never opens on a glide',
    bar: { shape: 'CVC', at: 0, sounds: GLIDE, note: 'glide opening' },
  },
  {
    name: 'cvcc_opens_plain',
    says: 'a word closing on a cluster never opens on a hush or a tooth',
    bar: { shape: 'CVCC', at: 0, sounds: MARKED, note: 'marked opening' },
  },
  {
    name: 'cvcc_opens_steady',
    says: 'a word closing on a cluster never opens on a glide',
    bar: { shape: 'CVCC', at: 0, sounds: GLIDE, note: 'glide opening' },
  },
  {
    name: 'cvcc_opens_loose',
    says: 'a word closing on a cluster never opens on a liquid',
    bar: { shape: 'CVCC', at: 0, sounds: LIQUID, note: 'liquid opening' },
  },
  {
    name: 'cvcc_opens_open',
    says: 'a word closing on a cluster never opens on a stop',
    bar: { shape: 'CVCC', at: 0, sounds: STOP, note: 'stop opening' },
  },
  {
    name: 'ccvc_closes_plain',
    says: 'a word opening on a cluster never closes on a hush or a tooth',
    bar: { shape: 'CCVC', at: 3, sounds: MARKED, note: 'marked closing' },
  },
  /**
   * There is no rule here barring a nasal from closing a word, and
   * there must not be.
   *
   * **Closing on a nasal is one of the most important things a word can
   * do.** `m` and `n` carry an enormous share of the closings in every
   * language that has them, and a Tune that cannot say `-am` or `-in`
   * has given up more than any count is worth.
   *
   * `q` closes less often than `m` and `n` but still plainly belongs,
   * which is `thing` and `song`. It is weighted below them in
   * `pick.ts` and barred nowhere.
   */
  {
    name: 'ccvc_closes_hard',
    says: 'a word opening on a cluster never closes on a liquid',
    bar: { shape: 'CCVC', at: 3, sounds: LIQUID, note: 'liquid closing' },
  },
  {
    name: 'ccvc_closes_soft',
    says: 'a word opening on a cluster never closes on a stop',
    bar: { shape: 'CCVC', at: 3, sounds: STOP, note: 'stop closing' },
  },
  {
    name: 'ccvc_opens_dry',
    says: 'a cluster opening never has a liquid in its second slot',
    bar: { shape: 'CCVC', at: 1, sounds: LIQUID, note: 'liquid second' },
  },
  {
    name: 'cvcc_closes_dry',
    says: 'a closing cluster never has a liquid in its first slot',
    bar: { shape: 'CVCC', at: 2, sounds: LIQUID, note: 'liquid first' },
  },
  {
    name: 'cvc_opens_voiced',
    says: 'a three letter word never opens on a voiceless stop',
    bar: {
      shape: 'CVC',
      at: 0,
      sounds: VOICELESS_STOP,
      note: 'voiceless opening',
    },
  },
  {
    name: 'cvcc_closes_thin',
    says: 'a closing cluster never has a nasal in its first slot',
    bar: { shape: 'CVCC', at: 2, sounds: NASAL, note: 'nasal first' },
  },
  {
    name: 'cvc_opens_light',
    says: 'a three letter word never opens on the breath',
    bar: { shape: 'CVC', at: 0, sounds: BREATH, note: 'breath opening' },
  },
  {
    name: 'cvcc_opens_light',
    says: 'a word closing on a cluster never opens on the breath',
    bar: { shape: 'CVCC', at: 0, sounds: BREATH, note: 'breath opening' },
  },
]

export const RULE_BY_NAME = new Map(RULES.map(r => [r.name, r]))

// ─── Rations ────────────────────────────────────────────

/**
 * The same idea said softly.
 *
 * A bar is all or nothing, and for a sound like the breath that is too
 * blunt: `h` plainly opens words, just not many of them. A ration lets
 * a sound keep a share of its openings instead of losing all of them.
 *
 * **These are all on the start**, because the opening is where a
 * language shows its preferences most plainly. `j`, `c`, `C` and `h`
 * are the four that should be thin there, and `x` is thinned only
 * lightly because it is an ordinary sound.
 *
 * Which share a sound keeps is decided by the word's own rank sum, so
 * it is fixed and spread evenly, never picked and never random.
 */
export type Portion = {
  name: string
  says: string
  ration: Ration
}

function onStart(
  name: string,
  says: string,
  sounds: Array<string>,
  keep: number,
  of: number,
): Array<Portion> {
  return (['CVC', 'CVCC'] as const).map(shape => ({
    name: `${name}_${shape.toLowerCase()}`,
    says,
    ration: { shape, at: 0, sounds, keep, of, note: name },
  }))
}

/**
 * Every slot of every shape, at a quarter, a half and three quarters.
 *
 * **Nothing here ever says never.** A family keeps a share of a slot,
 * and the share is the whole rule. Which share a given word falls in is
 * fixed by its own rank sum, so the thinning is spread evenly and is
 * the same on every run.
 */
const SLOTS: Array<{ shape: Shape; at: number; where: string }> = [
  { shape: 'CVC', at: 0, where: 'opens a three letter word' },
  { shape: 'CVC', at: 2, where: 'closes a three letter word' },
  { shape: 'CVCC', at: 0, where: 'opens a word closing on a cluster' },
  { shape: 'CVCC', at: 2, where: 'stands first in a closing cluster' },
  { shape: 'CVCC', at: 3, where: 'stands last in a closing cluster' },
  { shape: 'CCVC', at: 1, where: 'stands second in an opening cluster' },
  { shape: 'CCVC', at: 3, where: 'closes a word opening on a cluster' },
]

const FAMILIES: Array<{ name: string; sounds: Array<string>; call: string }> = [
  { name: 'marked', sounds: MARKED, call: 'a hush or a tooth sound' },
  { name: 'teeth', sounds: TEETH, call: 'c or C' },
  { name: 'soft_hush', sounds: ['j'], call: 'j' },
  { name: 'breath', sounds: BREATH, call: 'the breath' },
  { name: 'glide', sounds: GLIDE, call: 'a glide' },
  { name: 'liquid', sounds: LIQUID, call: 'a liquid' },
  { name: 'voiceless', sounds: VOICELESS_STOP, call: 'a voiceless stop' },
  { name: 'voiced', sounds: VOICED_STOP, call: 'a voiced stop' },
  { name: 'nasal', sounds: NASAL, call: 'a nasal' },
]

const SHARES: Array<{ keep: number; of: number; call: string }> = [
  { keep: 1, of: 4, call: 'a quarter of the time' },
  { keep: 1, of: 2, call: 'half the time' },
  { keep: 3, of: 4, call: 'three quarters of the time' },
]

function everySlot(): Array<Portion> {
  const out: Array<Portion> = []
  for (const slot of SLOTS) {
    for (const family of FAMILIES) {
      for (const share of SHARES) {
        out.push({
          name: `${family.name}_${share.keep}of${share.of}_${slot.shape.toLowerCase()}_${slot.at}`,
          says: `${family.call} ${slot.where} ${share.call}`,
          ration: {
            shape: slot.shape,
            at: slot.at,
            sounds: family.sounds,
            keep: share.keep,
            of: share.of,
            note: family.name,
          },
        })
      }
    }
  }
  return out
}

export const PORTIONS: Array<Portion> = [
  /**
   * Half and half, which is the honest version of "never opens on a
   * voiceless stop".
   *
   * `p`, `t` and `k` open words in every language that has them, so
   * refusing them outright says something false. Letting them take half
   * the openings they could says the true thing: the voiced side is
   * commoner here, but only somewhat.
   */
  ...onStart('voiceless_half', 'p, t and k open half the words they could', VOICELESS_STOP, 1, 2),
  ...onStart('voiceless_quarter', 'p, t and k open a quarter of the words they could', VOICELESS_STOP, 1, 4),
  ...onStart('voiceless_three_quarters', 'p, t and k open three quarters of the words they could', VOICELESS_STOP, 3, 4),
  ...onStart('voiced_half', 'b, d and g open half the words they could', VOICED_STOP, 1, 2),
  ...onStart('breath_quarter', 'the breath opens a quarter of the words it could', ['h'], 1, 4),
  ...onStart('breath_half', 'the breath opens half the words it could', ['h'], 1, 2),
  ...onStart('teeth_quarter', 'c and C open a quarter of the words they could', ['c', 'C'], 1, 4),
  ...onStart('teeth_half', 'c and C open half the words they could', ['c', 'C'], 1, 2),
  ...onStart('soft_hush_quarter', 'j opens a quarter of the words it could', ['j'], 1, 4),
  ...onStart('soft_hush_half', 'j opens half the words it could', ['j'], 1, 2),
  ...onStart('hush_three_quarters', 'x opens three quarters of the words it could', ['x'], 3, 4),
  ...onStart('marked_half', 'j, c, C and h open half the words they could', ['j', 'c', 'C', 'h'], 1, 2),
  ...onStart('marked_quarter', 'j, c, C and h open a quarter of the words they could', ['j', 'c', 'C', 'h'], 1, 4),
  ...onStart('marked_three_quarters', 'j, c, C and h open three quarters of the words they could', ['j', 'c', 'C', 'h'], 3, 4),
  ...everySlot(),
]
