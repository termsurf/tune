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

import type { Bar } from './plan'

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
