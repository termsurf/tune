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
  near: { groups: SIMILAR_GROUPS, reach: 1, slack: 0, seed: 20260914 },
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

export const MARKED_ONSETS = ['sl', 'sm', 'sn']

/** Closings that cannot follow `i` or `e`, so they are worth less. */
export const LIQUIDS = ['l', 'r']

export function opensOnLiquid(cluster: string): boolean {
  return LIQUIDS.includes(cluster[0])
}
