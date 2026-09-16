/**
 * The evolutionary layer: a population, crossover, and memory.
 *
 * `search.ts` holds a single state and walks it. That is annealing, and
 * it is section 4 of `note/tune/pipeline/evolve.md`. This is the rest:
 * many candidate lexicons at once, recombined rather than only mutated,
 * with a memory of what has already been tried and failed.
 *
 * ## Why crossover is worth having here
 *
 * Annealing improves one lexicon by small steps. It cannot take the good
 * number system out of one attempt and the good spatial system out of
 * another, because it only ever holds one attempt.
 *
 * **Ordinary crossover does not work on an assignment.** Splicing two
 * parents at a random index assigns the same form twice and leaves other
 * forms empty. Permutation problems have specialised operators for this,
 * but `evolve.md` names something better suited:
 *
 *   Parent A has an excellent number system.
 *   Parent B has an excellent spatial system.
 *   Take NUMBERS from A, SPACE from B, resolve displaced forms globally.
 *
 * So crossover here is SEMANTIC: it swaps whole regions of meaning and
 * repairs what that displaces. That is a move annealing cannot make at
 * any temperature, because it is a hundred coordinated changes at once.
 *
 * ## What this does not do, and why
 *
 * No Pareto ranking, no MAP-Elites, no islands, no novelty search. Those
 * all need an objective worth spreading a population across, and the
 * objective is not there yet: `echo` is switched off for placing and
 * `vibe` sits at noise on a held-out half. **A population optimising a
 * weak objective produces confident garbage faster than one state
 * does.** They are listed in `evolve.md` and they wait on the score.
 */

import { Board, Move, freeAt } from './board'
import { Bench, deltaOf, refresh } from './score'
import { anneal, stream } from './search'

// ─── Genomes ────────────────────────────────────────────

/**
 * A whole candidate lexicon: the meaning sitting on each form.
 *
 * Indexed by FORM, per `fitness.md`, so one array carries both the
 * assignment and the choice of which concepts exist at all.
 */
export type Genome = {
  meaning: Array<string>
  loss: number
  /** Where it came from, so a good result can be traced. */
  born: string
}

export function readGenome(board: Board, born: string): Genome {
  return { meaning: [...board.meaning], loss: 0, born }
}

export function loadGenome(bench: Bench, genome: Genome): number {
  const board = bench.board
  board.meaning = [...genome.meaning]
  board.at.clear()
  for (let i = 0; i < board.meaning.length; i++) {
    if (board.meaning[i]) {
      board.at.set(board.meaning[i], i)
    }
  }
  return refresh(bench)
}

// ─── Memory ─────────────────────────────────────────────

/**
 * What has been tried and rejected, so the search stops rediscovering
 * it. `evolve.md` section 5:
 *
 *   we've tried assigning BLUE to these 47 forms
 *
 * **This is the piece that matters most for a design somebody keeps
 * changing their mind about**, because without it every run re-proposes
 * the same handful of rejected words and the record cannot tell a fresh
 * idea from a repeat.
 */
export class Memory {
  private tried = new Map<string, Set<number>>()

  reject(meaning: string, at: number): void {
    const seen = this.tried.get(meaning) ?? new Set<number>()
    seen.add(at)
    this.tried.set(meaning, seen)
  }

  isTried(meaning: string, at: number): boolean {
    return this.tried.get(meaning)?.has(at) ?? false
  }

  countFor(meaning: string): number {
    return this.tried.get(meaning)?.size ?? 0
  }

  get size(): number {
    let sum = 0
    for (const seen of this.tried.values()) {
      sum += seen.size
    }
    return sum
  }

  /** Every meaning that has been pushed around the most, worst first. */
  restless(howMany = 15): Array<{ meaning: string; tried: number }> {
    return [...this.tried.entries()]
      .map(([meaning, seen]) => ({ meaning, tried: seen.size }))
      .sort((a, b) => b.tried - a.tried)
      .slice(0, howMany)
  }
}

// ─── Crossover ──────────────────────────────────────────

/**
 * Takes one REGION of meaning from `other` and keeps the rest of `self`.
 *
 * A region is a set of concepts that belong together, so the child gets
 * a whole coherent subsystem rather than a random scatter of bindings.
 *
 * **Collisions are repaired, not avoided.** A concept arriving from the
 * other parent may want a form this parent has given to something else,
 * and the displaced concept is pushed back into the waiting list rather
 * than dropped. That is the displacement cascade from `input.md`, and
 * letting it run is the point: the child is scored on the whole
 * resulting state, not on the move that started it.
 */
export function crossover(
  self: Genome,
  other: Genome,
  region: Set<string>,
): { child: Genome; displaced: Array<string> } {
  const meaning = [...self.meaning]
  const displaced: Array<string> = []

  // Lift the region out of both parents.
  const whereSelf = new Map<string, number>()
  for (let i = 0; i < meaning.length; i++) {
    if (meaning[i] && region.has(meaning[i])) {
      whereSelf.set(meaning[i], i)
      meaning[i] = ''
    }
  }

  // Lay the other parent's version of the region down.
  for (let i = 0; i < other.meaning.length; i++) {
    const says = other.meaning[i]
    if (!says || !region.has(says)) continue
    const sitting = meaning[i]
    if (sitting) {
      // Something outside the region holds this form. It moves.
      displaced.push(sitting)
    }
    meaning[i] = says
    whereSelf.delete(says)
  }

  // Anything in the region the other parent did not place is displaced.
  for (const left of whereSelf.keys()) {
    displaced.push(left)
  }

  return {
    child: {
      meaning,
      loss: 0,
      born: `${self.born} x ${other.born}`,
    },
    displaced,
  }
}

/**
 * Puts displaced concepts back, best free form first.
 *
 * Without this a crossover leaks meanings on every generation and the
 * population quietly shrinks toward an empty lexicon, which the coverage
 * term would reward. That failure is silent, which is why the repair is
 * part of the operator rather than a later step.
 */
export function repair(
  bench: Bench,
  genome: Genome,
  displaced: Array<string>,
  open: Set<number>,
  memory: Memory,
): number {
  loadGenome(bench, genome)
  const board = bench.board
  let placed = 0

  for (const meaning of displaced) {
    if (board.at.has(meaning)) continue
    const free = freeAt(board).filter(
      at => open.has(at) && !memory.isTried(meaning, at),
    )
    let bestAt = -1
    let best = Infinity
    for (const at of free) {
      const delta = deltaOf(bench, { kind: 'place', at, meaning })
      if (delta < best) {
        best = delta
        bestAt = at
      }
    }
    if (bestAt < 0) continue
    const move: Move = { kind: 'place', at: bestAt, meaning }
    board.meaning[bestAt] = meaning
    board.at.set(meaning, bestAt)
    void move
    placed++
  }

  genome.meaning = [...board.meaning]
  genome.loss = refresh(bench)
  return placed
}

// ─── The population ─────────────────────────────────────

export type Farm = {
  seed: number
  size: number
  generations: number
  /** Concepts grouped into regions crossover can swap whole. */
  regions: Array<{ name: string; members: Set<string> }>
  open: Set<number>
  /** Annealing steps each member gets to find its own local optimum. */
  settle: number
}

export type Harvest = {
  best: Genome
  start: number
  end: number
  crossed: number
  repaired: number
  memory: Memory
  /** Best loss at each generation, to see whether it is still moving. */
  curve: Array<number>
}

/**
 * Makes one member a DIFFERENT GOOD lexicon, not a damaged one.
 *
 * The first version only scattered: a handful of random swaps per
 * member. It produced nothing across a hundred crossovers, and the
 * reason is worth keeping written down.
 *
 * **Random damage cannot feed crossover.** Scattering makes every member
 * worse than the untouched one, so the untouched one wins selection
 * every generation and every child inherits somebody's damage. The
 * population converges on its own starting point immediately.
 *
 * Crossover pays only when two parents are each good at DIFFERENT
 * things, so each member is scattered and then annealed back down with
 * its own seed. It lands in a different local optimum, which is the
 * material the operator was written for.
 */
function scatter(
  bench: Bench,
  genome: Genome,
  farm: Farm,
  which: number,
): number {
  const next = stream(farm.seed + which * 7919)
  loadGenome(bench, genome)
  const board = bench.board
  const open = [...farm.open].filter(at => board.meaning[at])
  if (open.length < 2) {
    return refresh(bench)
  }

  // Kick it off the starting point.
  const howMany = 20 + which * 8
  for (let i = 0; i < howMany; i++) {
    const a = open[Math.floor(next() * open.length) % open.length]
    const b = open[Math.floor(next() * open.length) % open.length]
    if (a === b) continue
    const was = board.meaning[a]
    board.meaning[a] = board.meaning[b]
    board.meaning[b] = was
    if (board.meaning[a]) board.at.set(board.meaning[a], a)
    if (board.meaning[b]) board.at.set(board.meaning[b], b)
  }
  refresh(bench)

  // Then let it find its own way down, somewhere else.
  anneal(
    bench,
    { waiting: [], open: farm.open },
    {
      seed: farm.seed + which * 104729,
      steps: farm.settle,
      heat: 0.6,
      audit: 0,
    },
  )

  genome.meaning = [...board.meaning]
  return refresh(bench)
}

/**
 * Runs the population.
 *
 * Deterministic given the seed, per the rule in `fitness.md`: a search
 * may explore stochastically provided it replays exactly, and the seed
 * is recorded with the result.
 */
export function breed(
  bench: Bench,
  seedFrom: Genome,
  farm: Farm,
): Harvest {
  const next = stream(farm.seed)
  const memory = new Memory()
  const curve: Array<number> = []

  const start = loadGenome(bench, seedFrom)
  seedFrom.loss = start

  /**
   * Everyone begins from what exists, then is pushed apart.
   *
   * **Crossover between identical parents produces the identical child.**
   * The first version of this seeded the whole population with copies of
   * `base.csv` and ran 36 crossovers for zero changes, which is the
   * standard way a genetic algorithm does nothing at all.
   *
   * So each member is scattered first: a handful of random legal moves,
   * seeded from its own index so the whole run still replays exactly.
   * Member 0 is left untouched, so the population can never end up worse
   * than the lexicon it started from.
   */
  let flock: Array<Genome> = []
  for (let i = 0; i < farm.size; i++) {
    const mine = {
      meaning: [...seedFrom.meaning],
      loss: start,
      born: `seed-${i}`,
    }
    if (i > 0) {
      mine.loss = scatter(bench, mine, farm, i)
    }
    flock.push(mine)
  }

  let crossed = 0
  let repaired = 0

  for (let gen = 0; gen < farm.generations; gen++) {
    const young: Array<Genome> = []

    for (let i = 0; i < flock.length; i++) {
      const self = flock[i]
      const other = flock[Math.floor(next() * flock.length) % flock.length]
      if (self === other || farm.regions.length === 0) continue

      const region =
        farm.regions[Math.floor(next() * farm.regions.length) % farm.regions.length]
      const { child, displaced } = crossover(self, other, region.members)
      crossed++
      repaired += repair(bench, child, displaced, farm.open, memory)
      child.born = `g${gen} ${region.name}`
      young.push(child)
    }

    // Keep the best of parents and children together, so a generation
    // can never be worse than the one before it.
    flock = [...flock, ...young]
      .sort((a, b) => a.loss - b.loss)
      .slice(0, farm.size)

    // Remember every placement the losers made, so they are not retried.
    for (const loser of young.slice(farm.size)) {
      for (let at = 0; at < loser.meaning.length; at++) {
        if (loser.meaning[at] && loser.meaning[at] !== seedFrom.meaning[at]) {
          memory.reject(loser.meaning[at], at)
        }
      }
    }

    curve.push(flock[0].loss)
  }

  const best = flock[0]
  const end = loadGenome(bench, best)
  best.loss = end

  return { best, start, end, crossed, repaired, memory, curve }
}
