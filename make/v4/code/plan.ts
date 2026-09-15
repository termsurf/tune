/**
 * A plan is a whole Tune stated as data, and this builds one.
 *
 * Every knob that decides how many words a Tune has sits in one object,
 * so a variant is a plan with a field changed rather than a second
 * generator. `calculate.ts` builds the house plan with it and
 * `variant.ts` plugs other plans in and compares them.
 *
 *   open    single consonants that may open a word
 *   close   single consonants that may close a word
 *   onset   clusters that may open a word
 *   coda    clusters that may close a word
 *   vowel   the vowel ladder, in order, because closeness walks it
 *   rhyme   pairs that may not stand next to each other
 *   ban     sounds said nowhere
 *   shapes  which of CVC, CVCC and CCVC are built
 *   near    how hard the closeness pass squeezes
 *
 * The cluster lists ARE the cluster rules. There is no separate "is
 * this a listed cluster" test, because a cluster that is not in the
 * list is one the plan never builds a word from.
 *
 * The count has a closed form, and `predict` states it. `build` and
 * `predict` are checked against each other on every run, so a change to
 * one that the other does not agree with is caught rather than trusted.
 *
 *   CVC   = |open|  x (|vowel| x |close| - blocked)
 *   CVCC  = |open|  x (|vowel| x |coda|  - blocked)
 *   CCVC  = |onset| x (|vowel| x |close| - blocked)
 */

import { compareWords, type Shape } from './sound'

export type Near = {
  /** Consonants near enough that swapping one says nothing new. */
  groups: Array<Array<string>>
  /** Vowels this many notches apart still count as close. 0 turns the
   * vowel test into "the same vowel", which prunes least. */
  reach: number
  /** How many consonant slots may differ outright and the two words
   * still count as close. 0 is the strictest, and the house value. */
  slack: number
  /** Seeds the shuffle, so the lean pass repeats. */
  seed: number
}

export type Plan = {
  name: string
  note: string
  vowel: Array<string>
  open: Array<string>
  close: Array<string>
  onset: Array<string>
  coda: Array<string>
  rhyme: Array<string>
  ban: Array<string>
  shapes: Array<Shape>
  near: Near
}

export type Piece = {
  word: string
  shape: Shape
  onset: string
  vowel: string
  coda: string
}

export type Count = {
  full: Record<Shape, number>
  lean: Record<Shape, number>
  fullAll: number
  leanAll: number
}

// ─── Building ───────────────────────────────────────────

/** The two sides each shape draws from. */
function sidesOf(plan: Plan, shape: Shape): [Array<string>, Array<string>] {
  if (shape === 'CVC') return [plan.open, plan.close]
  if (shape === 'CVCC') return [plan.open, plan.coda]
  return [plan.onset, plan.close]
}

function allowed(plan: Plan, word: string): boolean {
  for (const sound of word) {
    if (plan.ban.includes(sound)) {
      return false
    }
  }
  for (let i = 0; i < word.length - 1; i++) {
    if (plan.rhyme.includes(word.slice(i, i + 2))) {
      return false
    }
  }
  return true
}

export function build(plan: Plan, shape: Shape): Array<Piece> {
  const [onsets, codas] = sidesOf(plan, shape)
  const pieces: Array<Piece> = []
  for (const onset of onsets) {
    for (const vowel of plan.vowel) {
      for (const coda of codas) {
        const word = onset + vowel + coda
        if (allowed(plan, word)) {
          pieces.push({ word, shape, onset, vowel, coda })
        }
      }
    }
  }
  /** Sorted here so the lean pass sees one order whoever calls it, and
   * two runs cannot disagree because the loops happened to differ. */
  pieces.sort((a, b) => compareWords(a.word, b.word))
  return pieces
}

/**
 * The same number without building anything.
 *
 * Every opening is worth the same amount, so the count is the number of
 * openings times what one opening buys. What one opening buys is every
 * vowel and closing pair the rhyme rule does not block.
 */
export function predict(plan: Plan, shape: Shape): number {
  const [onsets, codas] = sidesOf(plan, shape)

  const liveOnsets = onsets.filter(
    onset => ![...onset].some(s => plan.ban.includes(s)),
  ).length

  let perOnset = 0
  for (const vowel of plan.vowel) {
    for (const coda of codas) {
      const tail = vowel + coda
      if ([...tail].some(s => plan.ban.includes(s))) {
        continue
      }
      let blocked = false
      for (let i = 0; i < tail.length - 1; i++) {
        if (plan.rhyme.includes(tail.slice(i, i + 2))) {
          blocked = true
          break
        }
      }
      if (!blocked) {
        perOnset++
      }
    }
  }

  return liveOnsets * perOnset
}

// ─── Closeness ──────────────────────────────────────────

function nearMap(near: Near): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  function add(a: string, b: string) {
    if (!map.has(a)) map.set(a, new Set([a]))
    map.get(a)?.add(b)
  }
  for (const group of near.groups) {
    for (const a of group) {
      for (const b of group) {
        add(a, b)
      }
    }
  }
  return map
}

/**
 * Two words too close to be two words.
 *
 * `reach` decides how far apart the vowels may be, and `slack` how many
 * consonants may differ outright. Raising `reach` or `slack` calls more
 * pairs close and leaves fewer words standing. Lowering them is the
 * lenient direction.
 */
export function tooNear(
  plan: Plan,
  map: Map<string, Set<string>>,
  a: Piece,
  b: Piece,
): boolean {
  if (a.word === b.word || a.shape !== b.shape) {
    return false
  }

  const from = plan.vowel.indexOf(a.vowel)
  const to = plan.vowel.indexOf(b.vowel)
  if (from < 0 || to < 0 || Math.abs(from - to) > plan.near.reach) {
    return false
  }

  let apart = 0
  for (let i = 0; i < a.word.length; i++) {
    if (plan.vowel.includes(a.word[i])) {
      continue
    }
    const similar = map.get(a.word[i])?.has(b.word[i]) ?? a.word[i] === b.word[i]
    if (!similar) {
      apart++
      if (apart > plan.near.slack) {
        return false
      }
    }
  }
  return true
}

/** A small deterministic generator, so the shuffle repeats. */
export function makeRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: Array<T>, random: () => number): Array<T> {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Keep a word unless something already kept sounds like it.
 *
 * Only words carrying a vowel within `reach` can ever be too close, so
 * the kept words are bucketed by vowel and a candidate looks at the few
 * buckets that can hold a rival rather than the whole list.
 */
export function lean(plan: Plan, pieces: Array<Piece>): Array<Piece> {
  const map = nearMap(plan.near)
  const random = makeRandom(plan.near.seed)
  const kept: Array<Piece> = []
  const byVowel = new Map<string, Array<Piece>>()

  for (const vowel of plan.vowel) {
    byVowel.set(vowel, [])
  }

  for (const candidate of shuffle(pieces, random)) {
    const at = plan.vowel.indexOf(candidate.vowel)
    let close = false

    for (let i = at - plan.near.reach; i <= at + plan.near.reach; i++) {
      if (i < 0 || i >= plan.vowel.length) {
        continue
      }
      for (const other of byVowel.get(plan.vowel[i]) ?? []) {
        if (tooNear(plan, map, candidate, other)) {
          close = true
          break
        }
      }
      if (close) {
        break
      }
    }

    if (!close) {
      kept.push(candidate)
      byVowel.get(candidate.vowel)?.push(candidate)
    }
  }

  return kept
}

// ─── Counting ───────────────────────────────────────────

export function run(plan: Plan): {
  full: Record<Shape, Array<Piece>>
  lean: Record<Shape, Array<Piece>>
  count: Count
} {
  const full = {} as Record<Shape, Array<Piece>>
  const leaned = {} as Record<Shape, Array<Piece>>
  const fullCount = {} as Record<Shape, number>
  const leanCount = {} as Record<Shape, number>

  for (const shape of plan.shapes) {
    const pieces = build(plan, shape)

    const said = predict(plan, shape)
    if (said !== pieces.length) {
      throw new Error(
        `${plan.name}/${shape}: built ${pieces.length}, predicted ${said}`,
      )
    }

    const kept = lean(plan, pieces)
    kept.sort((a, b) => compareWords(a.word, b.word))

    full[shape] = pieces
    leaned[shape] = kept
    fullCount[shape] = pieces.length
    leanCount[shape] = leaned[shape].length
  }

  return {
    full,
    lean: leaned,
    count: {
      full: fullCount,
      lean: leanCount,
      fullAll: plan.shapes.reduce((n, s) => n + fullCount[s], 0),
      leanAll: plan.shapes.reduce((n, s) => n + leanCount[s], 0),
    },
  }
}

/** The count alone, skipping the lean pass, for sweeping many plans. */
export function countFull(plan: Plan): number {
  return plan.shapes.reduce((n, shape) => n + predict(plan, shape), 0)
}

// ─── Changing A Plan ────────────────────────────────────

export function withPlan(plan: Plan, change: Partial<Plan>): Plan {
  return { ...plan, ...change, near: { ...plan.near, ...change.near } }
}
