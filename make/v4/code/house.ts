/**
 * The house plan: v4 as it actually stands, stated as data.
 *
 * This is the one place the rules in `sound.ts` become the pools the
 * engine draws from. Everything that builds v4 words starts here, so a
 * variant is this object with a field changed and never a second
 * generator.
 *
 * The cluster lists are the cleared ones. A cluster holding a hush
 * never reaches a word, and in a plan the list IS the rule, so there is
 * no separate "is this cluster listed" test to fall out of step.
 */

import {
  BAD_ANYWHERE,
  BAD_CLOSE,
  BAD_OPEN,
  BAD_RHYME,
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  SHAPES,
  SIMILAR_GROUPS,
  VOWELS,
  holdsHush,
} from './sound'

import { SORT_ORDER } from '../../../code/phonology'

import type { Plan } from './plan'

export const HOUSE: Plan = {
  name: 'house',
  note: 'v4 as it stands',
  vowel: VOWELS,
  open: CONSONANTS.filter(
    c => !BAD_OPEN.includes(c) && !BAD_ANYWHERE.includes(c),
  ),
  close: CONSONANTS.filter(
    c => !BAD_CLOSE.includes(c) && !BAD_ANYWHERE.includes(c),
  ),
  onset: ONSET_CLUSTERS.filter(c => !holdsHush(c)),
  coda: CODA_CLUSTERS.filter(c => !holdsHush(c)),
  rhyme: BAD_RHYME,
  ban: BAD_ANYWHERE,
  shapes: [...SHAPES],
  near: { groups: SIMILAR_GROUPS, reach: 1, slack: 0 },
  echo: 'none',
  sieve: null,
  bar: [],
}

/** Ranks every sound, for a plan that thins by an even sieve. */
export const SOUND_RANK_MAP = new Map(SORT_ORDER.map((sound, i) => [sound, i]))

/**
 * When a plan has to shed sounds, these go first.
 *
 * The hushes and the interdentals are the marked consonants, and the
 * `s` plus sonorant openings are the marked clusters. Which sound goes
 * is a language decision rather than an arithmetic one, so it is stated
 * here in one place rather than decided inside a search.
 */
export const MARKED_SOUNDS = ['x', 'j', 'c', 'C']

/**
 * The openings that leave first, in the order they go.
 *
 * `vr` is the most marginal of the lot and goes ahead of everything.
 * **It matters less than `tx`**, which reads as a cluster and is not
 * one: `tx` is a digraph for a single sound and one of the two most
 * used openings in the language, so it goes last if it goes at all and
 * is never in this list.
 *
 * The three `s` plus sonorant openings follow `vr`, because "s clusters
 * only with a stop" is a rule somebody can state and the three leave
 * together.
 */
export const MARKED_ONSETS = ['vr', 'sl', 'sm', 'sn']

/**
 * The closings that leave first, in the order they go.
 *
 * A liquid plus a stop is the weakest kind of closing, and the plain
 * stops are weaker than the rubs. `lp lb` and `lt ld` go ahead of
 * everything, then their `r` counterparts.
 *
 * **`lf lv ls lz lc` are the ones worth keeping**, a liquid running
 * into a rub, which is the most audible closing the language has. They
 * are last in this list so they are last to go.
 */
export const MARKED_CODAS = [
  'lp', 'lb', 'lt', 'ld',
  'rp', 'rb', 'rt', 'rd',
  'lk', 'rk', 'rg',
]

/** Closings that cannot follow `i` or `e`, so they are worth less. */
export const LIQUIDS = ['l', 'r']

export function opensOnLiquid(cluster: string): boolean {
  return LIQUIDS.includes(cluster[0])
}
