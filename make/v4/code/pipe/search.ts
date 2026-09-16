/**
 * The search.
 *
 * Simulated annealing over the assignment, with the frozen words held
 * and everything else priced. `note/tune/pipeline/evolve.md` is the
 * design, `engine.md` is why it is shaped this way.
 *
 * ## On determinism
 *
 * The house rule is that nothing uses random. A GENERATOR must produce
 * the same artefact every run and `plan.ts` obeys that with `deal()`.
 *
 * A SEARCH is a different kind of program. It is allowed to explore
 * stochastically provided it is REPLAYABLE, and replayability comes from
 * recording the seed. Same seed, same version, same input, same result,
 * byte for byte. The seed is written into every run's report, so any
 * result can be reproduced or bisected.
 *
 * **Write the seed down or the genealogy is fiction.**
 */

import { Board, Move, freeAt, isLegal, touched } from './board'
import { Bench, checkDelta, countWord, deltaOf, refresh } from './score'

// ─── A deterministic stream ─────────────────────────────

/**
 * mulberry32. Small, fast, and identical on every machine and version,
 * which is the property that matters here. `Math.random` is none of
 * those things.
 */
export function stream(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Moves ──────────────────────────────────────────────

export type Pool = {
  /** Meanings wanting a form and not yet holding one. */
  waiting: Array<string>
  /**
   * Positions the search may touch. Everything else is held, whatever
   * its tier says.
   *
   * **This is the difference between a search and a scramble.** The
   * first version of this let any tier 1 position swap, and it rewrote
   * eleven hundred hand-made bindings in twenty thousand steps, which is
   * the opposite of what "base words stay for now" means. The caller
   * decides what is open, and the search cannot widen it.
   */
  open: Set<number>
}

function pick<T>(next: () => number, list: Array<T>): T {
  return list[Math.floor(next() * list.length) % list.length]
}

/**
 * Proposes one move.
 *
 * **Generated from the legal set, never filtered into it.** With 1,268
 * positions at tier 1 or 0, rejecting random proposals would throw away
 * a third of them, and far more near a frozen cluster. So the free list
 * is walked directly and a tier 1 position is only touched through a
 * swap, which is the cheap kind of displacement.
 */
function propose(
  board: Board,
  pool: Pool,
  free: Array<number>,
  taken: Array<number>,
  next: () => number,
): Move | null {
  const roll = next()

  // Place a waiting meaning on a free form.
  if (pool.waiting.length > 0 && roll < 0.45 && free.length > 0) {
    const at = pick(next, free)
    const meaning = pick(next, pool.waiting)
    return { kind: 'place', at, meaning }
  }

  // Swap two assignments, which is how a placed word improves.
  if (taken.length > 1) {
    const a = pick(next, taken)
    const b = roll < 0.85 && free.length > 0 ? pick(next, free) : pick(next, taken)
    if (a !== b) {
      return { kind: 'swap', a, b }
    }
  }

  return null
}

// ─── Annealing ──────────────────────────────────────────

export type Plan = {
  seed: number
  steps: number
  /** Starting temperature, in units of loss. */
  heat: number
  /** Every this many steps, prove the delta against a full recompute. */
  audit: number
}

export const DEFAULT_PLAN: Plan = {
  seed: 20260915,
  steps: 200000,
  heat: 4,
  audit: 20000,
}

export type Result = {
  plan: Plan
  before: number
  after: number
  placed: number
  moved: number
  tried: number
  kept: number
}

export function anneal(bench: Bench, pool: Pool, plan: Plan): Result {
  const next = stream(plan.seed)
  const board = bench.board
  const before = refresh(bench)

  const free = freeAt(board).filter(i => pool.open.has(i))
  const freeSet = new Set(free)

  const taken: Array<number> = []
  for (let i = 0; i < board.meaning.length; i++) {
    if (board.meaning[i] && board.tier[i] > 0 && pool.open.has(i)) {
      taken.push(i)
    }
  }

  let tried = 0
  let kept = 0
  let placed = 0
  let moved = 0

  const wait = [...pool.waiting]

  for (let step = 0; step < plan.steps; step++) {
    const move = propose(board, { waiting: wait, open: pool.open }, free, taken, next)
    if (!move || !isLegal(board, move)) {
      continue
    }
    for (const i of touched(move)) {
      if (!pool.open.has(i)) {
        throw new Error(`the search proposed a move on held position ${i}`)
      }
    }
    tried++

    if (plan.audit > 0 && step % plan.audit === 0 && step > 0) {
      checkDelta(bench, move)
      continue
    }

    const delta = deltaOf(bench, move)
    // Temperature falls to nothing, so the run ends in pure descent.
    const heat = plan.heat * (1 - step / plan.steps)
    const take =
      delta <= 0 || (heat > 0 && next() < Math.exp(-delta / heat))

    if (!take) {
      continue
    }

    if (move.kind === 'place') {
      const was = board.meaning[move.at]
      // The meaning that was there goes back in the queue, so nothing
      // is ever lost by being displaced.
      if (was) {
        wait.push(was)
      }
      const cut = wait.indexOf(move.meaning)
      if (cut >= 0) {
        wait[cut] = wait[wait.length - 1]
        wait.pop()
      }
      placed++
      if (freeSet.has(move.at)) {
        freeSet.delete(move.at)
        const gone = free.indexOf(move.at)
        if (gone >= 0) free.splice(gone, 1)
        taken.push(move.at)
      }
    } else if (move.kind === 'swap') {
      moved++
    }

    applyKept(bench, move)
    // The running total must move with the board, or the next audit
    // measures against a baseline that stopped being true thousands of
    // moves ago. This line is what the first audit failure was missing.
    bench.total += delta
    kept++
  }

  const after = refresh(bench)
  return { plan, before, after, placed, moved, tried, kept }
}

/**
 * Applies a move and keeps the sound counts in step.
 *
 * **The counts are not bookkeeping, they are an input.** `driftLoss`
 * reads them, and `deltaOf` reads `driftLoss`, so leaving them stale
 * here would make every later delta wrong in a way nothing crashes on.
 * That is exactly the failure `checkDelta` exists to catch, and the
 * cheapest place to not have it is here.
 */
function applyKept(bench: Bench, move: Move): void {
  const board = bench.board
  const at = touched(move)

  for (const i of at) {
    if (board.meaning[i]) {
      countWord(bench, board.forms[i], -1)
    }
  }

  switch (move.kind) {
    case 'swap': {
      const a = board.meaning[move.a]
      const b = board.meaning[move.b]
      board.meaning[move.a] = b
      board.meaning[move.b] = a
      if (a) board.at.set(a, move.b)
      if (b) board.at.set(b, move.a)
      break
    }
    case 'place': {
      const was = board.meaning[move.at]
      if (was) board.at.delete(was)
      board.meaning[move.at] = move.meaning
      board.at.set(move.meaning, move.at)
      break
    }
    case 'clear': {
      const was = board.meaning[move.at]
      if (was) board.at.delete(was)
      board.meaning[move.at] = ''
      break
    }
  }

  for (const i of at) {
    if (board.meaning[i]) {
      countWord(bench, board.forms[i], 1)
    }
  }
}

// ─── Greedy placement ───────────────────────────────────

/**
 * Places every waiting concept on the best form available to it.
 *
 * **This is "enumerate, then filter, then judge" from
 * `note/tune/pipeline/readme.md`, and it belongs before the annealing
 * rather than instead of it.**
 *
 * Annealing from nothing has to stumble onto a good echo by proposing it
 * at random, and there are 340 forms, so it mostly does not. Scoring
 * every free form for every waiting concept is 202 x 340 evaluations,
 * which is nothing, and it finds the best echo available by
 * construction.
 *
 * The order concepts are placed in matters, because early ones get the
 * pick of the board. So they are taken in the order the pool gives,
 * which is deterministic, and the annealing afterwards is what lets a
 * later concept take a form an earlier one should not have had.
 */
export function greedy(
  bench: Bench,
  waiting: Array<string>,
  open: Set<number>,
): { placed: number; skipped: number } {
  const board = bench.board
  const free: Array<number> = []
  for (const at of open) {
    if (!board.meaning[at] && board.tier[at] >= 4) {
      free.push(at)
    }
  }
  free.sort((a, b) => a - b)

  const spare = new Set(free)
  let placed = 0
  let skipped = 0

  /**
   * Place the concepts with the strongest single opportunity first.
   *
   * Taking them in pool order means whoever is alphabetically first gets
   * the pick of the board, which is arbitrary. A concept with one
   * outstanding form available should claim it before a concept that is
   * indifferent between forty forms takes it by accident.
   *
   * One ranking pass, then one placing pass. The ranking goes stale as
   * forms are consumed, which is what the annealing afterwards repairs.
   */
  const ranked = waiting
    .map(meaning => {
      let best = Infinity
      for (const at of spare) {
        const delta = deltaOf(bench, { kind: 'place', at, meaning })
        if (delta < best) best = delta
      }
      return { meaning, best }
    })
    .sort((a, b) => a.best - b.best)

  for (const { meaning } of ranked) {
    let bestAt = -1
    let bestDelta = Infinity
    for (const at of spare) {
      const delta = deltaOf(bench, { kind: 'place', at, meaning })
      if (delta < bestDelta) {
        bestDelta = delta
        bestAt = at
      }
    }
    // A placement that makes the lexicon worse is not made. The concept
    // stays unsaid, which is a real answer.
    if (bestAt < 0 || bestDelta >= 0) {
      skipped++
      continue
    }
    const move: Move = { kind: 'place', at: bestAt, meaning }
    applyKept(bench, move)
    bench.total += bestDelta
    spare.delete(bestAt)
    placed++
  }

  refresh(bench)
  return { placed, skipped }
}

// ─── Exact solving, for one small set ───────────────────

/**
 * The best assignment of `meanings` onto `forms`, searched exhaustively.
 *
 * This is the other half of the division of labour in `engine.md`. The
 * global search never solves anything exactly; a named system always
 * does. A quadratic assignment problem is NP-hard and instances above
 * roughly 30 are not solved to proven optimality, which sounds
 * discouraging and is fine here: **every named system in Tune is far
 * below the limit.** The mirror quartets are 4, the directions 6, the
 * numbers 16.
 *
 * Refuses rather than guesses above `LIMIT`, because a "best" that
 * silently became a heuristic is worse than an error.
 */
export const EXACT_LIMIT = 9

export function solveExact(
  bench: Bench,
  at: Array<number>,
  meanings: Array<string>,
): { order: Array<string>; loss: number } {
  if (at.length > EXACT_LIMIT) {
    throw new Error(
      `exact solving refuses ${at.length} slots, the limit is ${EXACT_LIMIT}. ` +
        'Use anneal for anything larger.',
    )
  }
  const board = bench.board
  const before = at.map(i => board.meaning[i])
  const slots = [...meanings]
  while (slots.length < at.length) {
    slots.push('')
  }

  let bestOrder: Array<string> = [...slots]
  let bestLoss = Infinity

  const walk = (rest: Array<string>, built: Array<string>): void => {
    if (rest.length === 0) {
      for (let k = 0; k < at.length; k++) {
        const had = board.meaning[at[k]]
        if (had) board.at.delete(had)
        board.meaning[at[k]] = built[k]
      }
      for (let k = 0; k < at.length; k++) {
        if (board.meaning[at[k]]) {
          board.at.set(board.meaning[at[k]], at[k])
        }
      }
      const loss = refresh(bench)
      if (loss < bestLoss) {
        bestLoss = loss
        bestOrder = [...built]
      }
      return
    }
    const seen = new Set<string>()
    for (let i = 0; i < rest.length; i++) {
      if (seen.has(rest[i])) continue
      seen.add(rest[i])
      const without = rest.slice(0, i).concat(rest.slice(i + 1))
      walk(without, [...built, rest[i]])
    }
  }

  walk(slots, [])

  // Put the board back, then let the caller apply the winner.
  for (let k = 0; k < at.length; k++) {
    const had = board.meaning[at[k]]
    if (had) board.at.delete(had)
    board.meaning[at[k]] = before[k]
  }
  for (let k = 0; k < at.length; k++) {
    if (board.meaning[at[k]]) {
      board.at.set(board.meaning[at[k]], at[k])
    }
  }
  refresh(bench)

  return { order: bestOrder, loss: bestLoss }
}
