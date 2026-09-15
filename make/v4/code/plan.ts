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

import { SORT_ORDER } from '../../../code/phonology'

import { compareWords, type Shape } from './sound'

/** The tone order, used wherever a rule needs a fixed number per sound. */
const RANK = new Map(SORT_ORDER.map((sound, i) => [sound, i]))

export type Near = {
  /** Consonants near enough that swapping one says nothing new. */
  groups: Array<Array<string>>
  /** Vowels this many notches apart still count as close. 0 turns the
   * vowel test into "the same vowel", which prunes least. */
  reach: number
  /** How many consonant slots may differ outright and the two words
   * still count as close. 0 is the strictest, and the house value. */
  slack: number
}

/**
 * What a word may not do across its own vowel.
 *
 * This is the one rule that thins a Tune WITHOUT taking anything out of
 * the pools, so every opening and every closing still reaches a word.
 *
 *   none     no restriction
 *   same     a word may not open and close on the same consonant
 *   similar  a word may not open and close on consonants from one
 *            similarity group, which is the rule Semitic roots follow
 */
export type Echo = 'none' | 'same' | 'similar'

/**
 * An even thinning, for when a rule alone does not land on the number
 * wanted.
 *
 * A word is kept when the sum of its sounds' ranks, modulo `mod`, is
 * one of `keep`. It cuts across the whole language rather than favouring
 * any sound, so every pool member survives in proportion.
 */
export type Sieve = {
  mod: number
  keep: Array<number>
  rank: Map<string, number>
}

/**
 * A sound refused at one slot of one shape.
 *
 * This is the knob that thins a Tune without shrinking its inventory.
 * "`CVC` never opens on a hush" takes a quarter off `CVC` while leaving
 * the hushes free to open a `CVCC` and to close anything, so the sound
 * is still in the language. `at` is the position in the written word,
 * counting from zero, so `CCVC` slot 1 is the second half of the
 * opening cluster.
 */
export type Bar = {
  shape: Shape
  at: number
  sounds: Array<string>
  note: string
}

/**
 * A sound allowed at a slot only some of the time.
 *
 * A `Bar` is all or nothing: the breath never opens a three letter
 * word. That is a blunt thing to say about a sound that plainly does
 * open words, just not many. A ration says the softer and truer thing.
 *
 *   h opens a quarter of the three letter words it could
 *   x opens three quarters of them
 *
 * Which quarter is decided by the word's own rank sum, so it is fixed
 * and even rather than picked. **Nothing here is random.**
 */
export type Ration = {
  shape: Shape
  at: number
  sounds: Array<string>
  keep: number
  of: number
  note: string
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
  /** Forms refused outright, whatever the rules allow. */
  taboo: Array<string>
  shapes: Array<Shape>
  near: Near
  echo: Echo
  sieve: Sieve | null
  bar: Array<Bar>
  ration: Array<Ration>
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

function allowed(
  plan: Plan,
  map: Map<string, Set<string>>,
  shape: Shape,
  word: string,
): boolean {
  if (plan.taboo.includes(word)) {
    return false
  }

  for (const sound of word) {
    if (plan.ban.includes(sound)) {
      return false
    }
  }

  for (const bar of plan.bar) {
    if (bar.shape === shape && bar.sounds.includes(word[bar.at])) {
      return false
    }
  }

  for (const ration of plan.ration) {
    if (ration.shape !== shape || !ration.sounds.includes(word[ration.at])) {
      continue
    }
    let sum = 0
    for (const sound of word) {
      sum += RANK.get(sound) ?? 0
    }
    if (sum % ration.of >= ration.keep) {
      return false
    }
  }
  for (let i = 0; i < word.length - 1; i++) {
    if (plan.rhyme.includes(word.slice(i, i + 2))) {
      return false
    }
  }

  /** The two ends of the word, whether or not either is a cluster. */
  const head = word[0]
  const tail = word[word.length - 1]

  if (plan.echo === 'same' && head === tail) {
    return false
  }
  if (plan.echo === 'similar') {
    const near = map.get(head)?.has(tail) ?? head === tail
    if (near) {
      return false
    }
  }

  if (plan.sieve) {
    let sum = 0
    for (const sound of word) {
      sum += plan.sieve.rank.get(sound) ?? 0
    }
    if (!plan.sieve.keep.includes(sum % plan.sieve.mod)) {
      return false
    }
  }

  return true
}

export function build(plan: Plan, shape: Shape): Array<Piece> {
  const [onsets, codas] = sidesOf(plan, shape)
  const map = nearMap(plan.near)
  const pieces: Array<Piece> = []
  for (const onset of onsets) {
    for (const vowel of plan.vowel) {
      for (const coda of codas) {
        const word = onset + vowel + coda
        if (allowed(plan, map, shape, word)) {
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
/**
 * The closed form only holds while no rule looks at both ends of a word
 * at once. `echo` and `sieve` both do, so with either of them on the
 * count has to be built rather than predicted.
 */
export function separable(plan: Plan): boolean {
  return (
    plan.echo === 'none' &&
    plan.sieve === null &&
    plan.bar.length === 0 &&
    plan.ration.length === 0
  )
}

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

  /**
   * The taboo list is a flat subtraction, so the closed form survives
   * it: count the product, then take off the forms this shape would
   * otherwise have built.
   */
  let refused = 0
  for (const word of plan.taboo) {
    for (const onset of onsets) {
      if (!word.startsWith(onset)) {
        continue
      }
      const tail = word.slice(onset.length)
      const vowel = tail[0]
      const coda = tail.slice(1)
      if (!plan.vowel.includes(vowel) || !codas.includes(coda)) {
        continue
      }
      if (plan.rhyme.includes(vowel + coda[0])) {
        continue
      }
      if ([...word].some(s => plan.ban.includes(s))) {
        continue
      }
      refused++
    }
  }

  return liveOnsets * perOnset - refused
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

/**
 * Deals the words out one opening at a time, round and round.
 *
 * The closeness pass is greedy, so whatever it sees first it keeps, and
 * the order it sees things in decides which words survive. Walking the
 * sorted list straight through would give every survivor to the
 * openings that sort early and starve the rest.
 *
 * v3 shuffled to avoid that, which spread the survivors but meant two
 * runs never agreed. **There is no randomness here, seeded or
 * otherwise.** Bucketing by opening and taking one from each bucket in
 * turn spreads them the same way and is a fixed answer: the same input
 * gives the same list, every time, on any machine.
 */
export function deal(pieces: Array<Piece>): Array<Piece> {
  const buckets = new Map<string, Array<Piece>>()
  const order: Array<string> = []

  for (const piece of pieces) {
    let bucket = buckets.get(piece.onset)
    if (!bucket) {
      bucket = []
      buckets.set(piece.onset, bucket)
      order.push(piece.onset)
    }
    bucket.push(piece)
  }

  const out: Array<Piece> = []
  for (let round = 0; out.length < pieces.length; round++) {
    let moved = false
    for (const key of order) {
      const bucket = buckets.get(key)
      if (bucket && round < bucket.length) {
        out.push(bucket[round])
        moved = true
      }
    }
    if (!moved) {
      break
    }
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
  const kept: Array<Piece> = []
  const byVowel = new Map<string, Array<Piece>>()

  for (const vowel of plan.vowel) {
    byVowel.set(vowel, [])
  }

  for (const candidate of deal(pieces)) {
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

    /** The fast counter is what every sweep trusts, so it is held to
     * the built list on every single run rather than now and then. */
    const counted = tally(plan, shape)
    if (counted !== pieces.length) {
      throw new Error(
        `${plan.name}/${shape}: built ${pieces.length}, tallied ${counted}`,
      )
    }

    if (separable(plan)) {
      const said = predict(plan, shape)
      if (said !== pieces.length) {
        throw new Error(
          `${plan.name}/${shape}: built ${pieces.length}, predicted ${said}`,
        )
      }
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

/**
 * Counts one shape without building a single word.
 *
 * A sweep over thousands of plans cannot afford to make and sort a
 * couple of thousand strings for each one, so this does the same
 * arithmetic on integers.
 *
 * The three tests each collapse to something precomputable:
 *
 *   rhyme   depends only on the vowel and the first sound of the
 *           closing, so it becomes a 5 bit mask per closing
 *   bar     refuses a sound at one slot, which is the same as taking
 *           members out of that side's pool before the loop starts
 *   echo    depends only on the first and last sound, so it becomes a
 *           lookup over the two ends
 *   sieve   needs the rank sum, and the onset and coda parts of that
 *           sum do not change inside the vowel loop
 *
 * What is left is an integer triple loop with no allocation in it.
 */
export function tally(plan: Plan, shape: Shape): number {
  const [rawOnsets, rawCodas] = sidesOf(plan, shape)
  const map = nearMap(plan.near)

  const banned = (part: string) =>
    [...part].some(s => plan.ban.includes(s))

  /** A bar at a slot is a pool filter, worked out once. */
  const barsHere = plan.bar.filter(b => b.shape === shape)
  const onsetWidth = shape === 'CCVC' ? 2 : 1
  const vowelAt = onsetWidth

  function keepOnset(onset: string): boolean {
    if (banned(onset)) return false
    return !barsHere.some(b => b.at < onsetWidth && b.sounds.includes(onset[b.at]))
  }

  function keepCoda(coda: string): boolean {
    if (banned(coda)) return false
    return !barsHere.some(
      b => b.at > vowelAt && b.sounds.includes(coda[b.at - vowelAt - 1]),
    )
  }

  const onsets = rawOnsets.filter(keepOnset)
  const codas = rawCodas.filter(keepCoda)

  /**
   * Taboo forms, filed by the opening they start with, so the inner
   * loop asks a set rather than building a string for every candidate.
   */
  const tabooTails = new Map<string, Set<string>>()
  for (const word of plan.taboo) {
    for (const onset of onsets) {
      if (!word.startsWith(onset)) {
        continue
      }
      const tails = tabooTails.get(onset) ?? new Set<string>()
      tails.add(word.slice(onset.length))
      tabooTails.set(onset, tails)
    }
  }

  const vowels = plan.vowel.filter(
    v => !plan.ban.includes(v) && !barsHere.some(b => b.at === vowelAt && b.sounds.includes(v)),
  )

  if (onsets.length === 0 || codas.length === 0 || vowels.length === 0) {
    return 0
  }

  const rank = plan.sieve?.rank
  const mod = plan.sieve?.mod ?? 0
  const keepSet = plan.sieve ? new Set(plan.sieve.keep) : null

  /**
   * A ration needs the whole word's rank sum, like the sieve does, but
   * it only bites when its own slot holds one of its sounds. Which pool
   * members that is never changes inside the loop, so it is worked out
   * once and the inner loop only asks a boolean.
   */
  const rations = plan.ration.filter(r => r.shape === shape)
  const needsRank = rations.length > 0 || keepSet !== null

  const rationHits = rations.map(ration => ({
    ration,
    onOnset: ration.at < onsetWidth,
    onVowel: ration.at === vowelAt,
    onCoda: ration.at > vowelAt,
    slot: ration.at < onsetWidth ? ration.at : ration.at - vowelAt - 1,
  }))

  /** Which vowels each closing may follow, and the closing's rank sum. */
  const codaOk: Array<Array<boolean>> = []
  const codaRank: Array<number> = []
  const codaTail: Array<string> = []

  for (const coda of codas) {
    const ok = vowels.map(v => !plan.rhyme.includes(v + coda[0]))
    codaOk.push(ok)
    let sum = 0
    if (needsRank) {
      for (const s of coda) {
        sum += RANK.get(s) ?? 0
      }
    }
    codaRank.push(sum)
    codaTail.push(coda[coda.length - 1])
  }

  const vowelRank = vowels.map(v => (needsRank ? (RANK.get(v) ?? 0) : 0))

  let total = 0

  for (let oi = 0; oi < onsets.length; oi++) {
    const onset = onsets[oi]
    const head = onset[0]

    let onsetSum = 0
    if (needsRank) {
      for (const s of onset) {
        onsetSum += RANK.get(s) ?? 0
      }
    }

    /** Which rations this opening could trip, worked out per opening. */
    const live = rationHits.filter(hit =>
      hit.onOnset ? hit.ration.sounds.includes(onset[hit.slot]) : true,
    )

    const banned = tabooTails.get(onset)

    for (let ci = 0; ci < codas.length; ci++) {
      if (plan.echo !== 'none') {
        const tail = codaTail[ci]
        const near =
          plan.echo === 'same'
            ? head === tail
            : (map.get(head)?.has(tail) ?? head === tail)
        if (near) {
          continue
        }
      }

      const ok = codaOk[ci]
      const coda = codas[ci]

      if (!keepSet && live.length === 0 && !banned) {
        for (let vi = 0; vi < vowels.length; vi++) {
          if (ok[vi]) total++
        }
        continue
      }

      /** Rations still in play once the closing is known too. */
      const biting = live.filter(hit =>
        hit.onCoda ? hit.ration.sounds.includes(coda[hit.slot]) : true,
      )

      const partial = onsetSum + codaRank[ci]

      for (let vi = 0; vi < vowels.length; vi++) {
        if (!ok[vi]) {
          continue
        }
        if (banned && banned.has(vowels[vi] + coda)) {
          continue
        }
        const sum = partial + vowelRank[vi]
        if (keepSet && !keepSet.has(sum % mod)) {
          continue
        }
        let allowed = true
        for (const hit of biting) {
          if (hit.onVowel && !hit.ration.sounds.includes(vowels[vi])) {
            continue
          }
          if (sum % hit.ration.of >= hit.ration.keep) {
            allowed = false
            break
          }
        }
        if (allowed) {
          total++
        }
      }
    }
  }

  return total
}

/** The count alone, skipping the lean pass, for sweeping many plans. */
export function countFull(plan: Plan): number {
  if (separable(plan)) {
    return plan.shapes.reduce((n, shape) => n + predict(plan, shape), 0)
  }
  return plan.shapes.reduce((n, shape) => n + build(plan, shape).length, 0)
}

// ─── Coverage ───────────────────────────────────────────

export type Coverage = {
  /** Pool members that got listed and then stranded. */
  open: Array<string>
  close: Array<string>
  onset: Array<string>
  coda: Array<string>
  /** Sounds the inventory claims that no word anywhere uses. */
  sound: Array<string>
  /** Every pool member reaches a word. */
  pools: boolean
  /** Every sound reaches a word, somewhere, at some position. */
  whole: boolean
}

/**
 * Which pool members never reach a word.
 *
 * A plan that thins by rule rather than by dropping is only honest if
 * every opening and every closing it still lists actually turns up, so
 * this reports what got listed and then stranded.
 */
export function coverage(
  plan: Plan,
  full: Record<Shape, Array<Piece>>,
  inventory: Array<string>,
): Coverage {
  const usedOpen = new Set<string>()
  const usedClose = new Set<string>()
  const usedOnset = new Set<string>()
  const usedCoda = new Set<string>()
  const usedSound = new Set<string>()

  for (const shape of plan.shapes) {
    for (const piece of full[shape] ?? []) {
      if (shape === 'CVC') {
        usedOpen.add(piece.onset)
        usedClose.add(piece.coda)
      } else if (shape === 'CVCC') {
        usedOpen.add(piece.onset)
        usedCoda.add(piece.coda)
      } else {
        usedOnset.add(piece.onset)
        usedClose.add(piece.coda)
      }
      for (const sound of piece.word) {
        usedSound.add(sound)
      }
    }
  }

  const open = plan.open.filter(c => !usedOpen.has(c))
  const close = plan.close.filter(c => !usedClose.has(c))
  const onset = plan.onset.filter(c => !usedOnset.has(c))
  const coda = plan.coda.filter(c => !usedCoda.has(c))
  const sound = inventory.filter(s => !usedSound.has(s))

  const pools =
    open.length === 0 &&
    close.length === 0 &&
    onset.length === 0 &&
    coda.length === 0

  return { open, close, onset, coda, sound, pools, whole: sound.length === 0 }
}

// ─── Changing A Plan ────────────────────────────────────

export function withPlan(plan: Plan, change: Partial<Plan>): Plan {
  return { ...plan, ...change, near: { ...plan.near, ...change.near } }
}
