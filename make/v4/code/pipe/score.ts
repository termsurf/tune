/**
 * What "earns its place" means as a number, and the delta forms that
 * make a search of it affordable.
 *
 * ## The one rule this file exists to keep
 *
 * A full score reads every near pair, which is millions of comparisons.
 * A swap touches two rows. `note/tune/pipeline/engine.md`:
 *
 *   Every objective goes in the inner loop only if it has a delta form.
 *
 * So every term here is written twice, once whole and once incremental,
 * and `checkDelta` proves they agree. That cross-check is the same
 * discipline `plan.ts` uses between `tally` and `build`, and it is the
 * only thing that catches a delta bug, which is otherwise silent.
 *
 * ## Lower is better
 *
 * This is a LOSS. Annealing minimises it and every term is a penalty.
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

import { parse } from 'csv-parse/sync'

import { Board, Move, TERM, shapeOf, touched } from './board'
import { ECHO_STRONG, echoScore } from './echo'
import { heardGap, readGap } from './tone'

// ─── Weights ────────────────────────────────────────────

/**
 * Do not read these as measured. They are a starting point, and
 * `note/tune/pipeline/score.md` says the right way to get them is to fit
 * them to the words already chosen by hand. `pipe/fit.ts` does that and
 * writes `weight.json`, which overrides these when it exists.
 */
export type Weights = {
  echo: number
  spread: number
  script: number
  length: number
  drift: number
}

export const DEFAULT_WEIGHTS: Weights = {
  echo: 1,
  spread: 2.5,
  script: 0.8,
  length: 0.6,
  drift: 1.2,
}

export function readWeights(): Weights {
  const file = resolve(TERM, 'weight.json')
  if (!existsSync(file)) {
    return DEFAULT_WEIGHTS
  }
  return { ...DEFAULT_WEIGHTS, ...JSON.parse(readFileSync(file, 'utf-8')) }
}

// ─── Importance ─────────────────────────────────────────

/**
 * How much a concept matters, which decides how hard the score fights
 * for it.
 *
 * **This is the weakest part of the whole score and it should be said
 * plainly.** The right input is a frequency distribution over concepts
 * and Tune has no corpus, so this reads the hand-made lists instead:
 * a word named in `must`, `kind`, `build` or `root` counts double.
 * `note/tune/pipeline/engine.md` calls borrowing frequency at the
 * concept layer the way to fix this properly.
 */
function readImportance(): Map<string, number> {
  const out = new Map<string, number>()
  for (const name of ['must', 'kind', 'build', 'root']) {
    const file = resolve(TERM, `${name}.csv`)
    if (!existsSync(file)) continue
    const rows: Array<Record<string, string>> = parse(
      readFileSync(file, 'utf-8'),
      { columns: true, skip_empty_lines: true, relax_column_count: true },
    )
    for (const row of rows) {
      const key = (row.meaning ?? row.term ?? row.word ?? '').trim()
      if (key) {
        out.set(key, 2)
      }
    }
  }
  return out
}

// ─── The static tables ──────────────────────────────────

/**
 * Everything about the FORMS, computed once.
 *
 * The form inventory never changes, so phonetic distance between two
 * words is a property of the language rather than of the assignment.
 * This is the expensive half of the problem and it is static, which is
 * the observation `engine.md` is built on.
 */
export type Tables = {
  /** For each form, the forms near it in the ear, and how near. */
  heard: Array<Array<[number, number]>>
  /** The same on the page, from the eight mirror pairs. */
  read: Array<Array<[number, number]>>
  shape: Array<string>
}

/** Below this two words are near enough to interfere. */
const HEARD_NEAR = 0.34
const READ_NEAR = 0.34

export function buildTables(forms: Array<string>): Tables {
  const n = forms.length
  const heard: Array<Array<[number, number]>> = []
  const read: Array<Array<[number, number]>> = []
  for (let i = 0; i < n; i++) {
    heard.push([])
    read.push([])
  }

  // Only same-length words can be near, which cuts the work by half.
  const byLength = new Map<number, Array<number>>()
  for (let i = 0; i < n; i++) {
    const len = forms[i].length
    const list = byLength.get(len) ?? []
    list.push(i)
    byLength.set(len, list)
  }

  for (const group of byLength.values()) {
    for (let a = 0; a < group.length; a++) {
      const i = group[a]
      for (let b = a + 1; b < group.length; b++) {
        const j = group[b]
        const h = heardGap(forms[i], forms[j])
        if (h < HEARD_NEAR) {
          heard[i].push([j, 1 - h / HEARD_NEAR])
          heard[j].push([i, 1 - h / HEARD_NEAR])
        }
        const r = readGap(forms[i], forms[j])
        if (r < READ_NEAR) {
          read[i].push([j, 1 - r / READ_NEAR])
          read[j].push([i, 1 - r / READ_NEAR])
        }
      }
    }
  }

  return { heard, read, shape: forms.map(shapeOf) }
}

// ─── The per-word terms ─────────────────────────────────

export type Bench = {
  board: Board
  tables: Tables
  weights: Weights
  importance: Map<string, number>
  /** Cached per-word loss, so a delta never recomputes a whole column. */
  own: Float64Array
  /** Cached sound counts, for the drift term. */
  count: Map<string, number>
  total: number
}

function importanceOf(bench: Bench, meaning: string): number {
  if (!meaning) return 0
  return bench.importance.get(meaning) ?? 1
}

/**
 * What one word costs on its own, ignoring its neighbours.
 *
 * Two terms. **Echo is the first half of the ordering rule** and is
 * treated as a threshold rather than a slope: past `ECHO_STRONG` the
 * remaining distance is nearly free, because a strong echo is decisive
 * and should not be traded away for a small gain elsewhere.
 */
function ownLoss(bench: Bench, at: number): number {
  const meaning = bench.board.meaning[at]
  if (!meaning) {
    return 0
  }
  const word = bench.board.forms[at]
  const weight = importanceOf(bench, meaning)
  const w = bench.weights

  const echo = echoScore(word, meaning)
  const echoLoss = echo >= ECHO_STRONG ? (1 - echo) * 0.15 : 1 - echo

  // A word carrying more weight wants to be shorter. CVC is scarce.
  const shape = bench.tables.shape[at]
  const lengthLoss = weight > 1 && shape !== 'CVC' ? 1 : 0

  return w.echo * echoLoss * weight + w.length * lengthLoss
}

/**
 * What one word costs through its neighbours.
 *
 * A pair is only a problem when BOTH forms carry a meaning, which is
 * why an empty lexicon scores zero here and a crowded one scores badly.
 * Weighted by both importances, because two common words colliding is
 * far worse than two rare ones.
 */
function pairLoss(bench: Bench, at: number): number {
  const mine = bench.board.meaning[at]
  if (!mine) {
    return 0
  }
  const weight = importanceOf(bench, mine)
  const w = bench.weights
  let loss = 0
  for (const [other, near] of bench.tables.heard[at]) {
    const theirs = bench.board.meaning[other]
    if (!theirs) continue
    loss += w.spread * near * weight * importanceOf(bench, theirs)
  }
  for (const [other, near] of bench.tables.read[at]) {
    const theirs = bench.board.meaning[other]
    if (!theirs) continue
    loss += w.script * near * weight * importanceOf(bench, theirs)
  }
  return loss
}

// ─── The global term ────────────────────────────────────

/**
 * How far the sounds actually used sit from an even spread.
 *
 * The house rule is that all 22 consonants and 5 vowels stay in play, so
 * a lexicon that crowds into a corner of the inventory is worse than its
 * per-word scores suggest. This is the only term that cannot be read off
 * one word, and it is cheap because it is counts rather than pairs.
 */
function driftLoss(bench: Bench): number {
  let used = 0
  for (const n of bench.count.values()) {
    used += n
  }
  if (used === 0) {
    return 0
  }
  const sounds = [...bench.count.keys()]
  const even = used / Math.max(1, sounds.length)
  let off = 0
  for (const n of bench.count.values()) {
    off += Math.abs(n - even)
  }
  return bench.weights.drift * (off / used)
}

function countWord(bench: Bench, word: string, by: number): void {
  for (const sound of word.split('')) {
    bench.count.set(sound, (bench.count.get(sound) ?? 0) + by)
  }
}

// ─── Whole and incremental ──────────────────────────────

export function makeBench(
  board: Board,
  tables: Tables,
  weights: Weights = readWeights(),
): Bench {
  const bench: Bench = {
    board,
    tables,
    weights,
    importance: readImportance(),
    own: new Float64Array(board.forms.length),
    count: new Map(),
    total: 0,
  }
  for (const sound of 'ieaou'.split('')) {
    bench.count.set(sound, 0)
  }
  for (const sound of 'mnqgdbptkhsfvzjxcCwlry'.split('')) {
    bench.count.set(sound, 0)
  }
  refresh(bench)
  return bench
}

/** Recomputes everything from scratch. The witness the delta is held to. */
export function refresh(bench: Bench): number {
  for (const key of bench.count.keys()) {
    bench.count.set(key, 0)
  }
  let sum = 0
  for (let at = 0; at < bench.board.forms.length; at++) {
    const own = ownLoss(bench, at)
    bench.own[at] = own
    sum += own
    if (bench.board.meaning[at]) {
      countWord(bench, bench.board.forms[at], 1)
    }
  }
  // Each pair is counted from both ends, so halve it.
  let pairs = 0
  for (let at = 0; at < bench.board.forms.length; at++) {
    pairs += pairLoss(bench, at)
  }
  bench.total = sum + pairs / 2 + driftLoss(bench)
  return bench.total
}

/**
 * What a move would cost, without applying it.
 *
 * Only the touched positions and their neighbours change, so this reads
 * a few hundred entries where `refresh` reads millions. The pair terms
 * between two touched positions would otherwise be counted twice, and
 * the `seen` set is what stops that.
 */
export function deltaOf(bench: Bench, move: Move): number {
  const at = touched(move)
  const before = at.map(i => bench.board.meaning[i])

  const was = localLoss(bench, at)
  const wasDrift = driftLoss(bench)

  for (const i of at) {
    if (bench.board.meaning[i]) {
      countWord(bench, bench.board.forms[i], -1)
    }
  }
  applyQuiet(bench.board, move)
  for (const i of at) {
    if (bench.board.meaning[i]) {
      countWord(bench, bench.board.forms[i], 1)
    }
  }

  const now = localLoss(bench, at)
  const nowDrift = driftLoss(bench)

  // Put it back exactly as it was.
  for (const i of at) {
    if (bench.board.meaning[i]) {
      countWord(bench, bench.board.forms[i], -1)
    }
  }
  for (let k = 0; k < at.length; k++) {
    const i = at[k]
    const had = bench.board.meaning[i]
    if (had) bench.board.at.delete(had)
    bench.board.meaning[i] = before[k]
  }
  for (let k = 0; k < at.length; k++) {
    const i = at[k]
    if (bench.board.meaning[i]) {
      bench.board.at.set(bench.board.meaning[i], i)
      countWord(bench, bench.board.forms[i], 1)
    }
  }

  return now - was + (nowDrift - wasDrift)
}

/** Every loss term that any of these positions participates in. */
function localLoss(bench: Bench, at: Array<number>): number {
  const here = new Set(at)
  let sum = 0
  for (const i of at) {
    sum += ownLoss(bench, i)
  }
  const seen = new Set<string>()
  for (const i of at) {
    const mine = bench.board.meaning[i]
    if (!mine) continue
    const weight = importanceOf(bench, mine)
    for (const [kind, list, w] of [
      ['h', bench.tables.heard[i], bench.weights.spread],
      ['r', bench.tables.read[i], bench.weights.script],
    ] as const) {
      for (const [other, near] of list) {
        const theirs = bench.board.meaning[other]
        if (!theirs) continue
        // A pair with both ends inside `at` must only be counted once.
        if (here.has(other)) {
          const key = `${kind}:${Math.min(i, other)}:${Math.max(i, other)}`
          if (seen.has(key)) continue
          seen.add(key)
        }
        sum += w * near * weight * importanceOf(bench, theirs)
      }
    }
  }
  return sum
}

/** `apply` without touching the caches, which `deltaOf` manages itself. */
function applyQuiet(board: Board, move: Move): void {
  switch (move.kind) {
    case 'swap': {
      const a = board.meaning[move.a]
      const b = board.meaning[move.b]
      board.meaning[move.a] = b
      board.meaning[move.b] = a
      if (a) board.at.set(a, move.b)
      if (b) board.at.set(b, move.a)
      return
    }
    case 'place': {
      const was = board.meaning[move.at]
      if (was) board.at.delete(was)
      board.meaning[move.at] = move.meaning
      board.at.set(move.meaning, move.at)
      return
    }
    case 'clear': {
      const was = board.meaning[move.at]
      if (was) board.at.delete(was)
      board.meaning[move.at] = ''
      return
    }
  }
}

/**
 * Proves the delta against a full recompute.
 *
 * **Call this every move while developing and every thousandth move in
 * a long run.** A wrong delta does not crash, it quietly optimises a
 * different function than the one written down, and nothing else
 * notices.
 */
export function checkDelta(bench: Bench, move: Move): void {
  const predicted = deltaOf(bench, move)
  const before = bench.total
  applyQuiet(bench.board, move)
  const after = refresh(bench)
  const actual = after - before
  const slack = Math.max(1e-6, Math.abs(actual) * 1e-9)
  if (Math.abs(predicted - actual) > slack) {
    throw new Error(
      `delta says ${predicted.toFixed(9)}, full score says ${actual.toFixed(9)}`,
    )
  }
}

// ─── Per-word reporting ─────────────────────────────────

export type Card = {
  word: string
  meaning: string
  tier: number
  shape: string
  echo: number
  own: number
  pair: number
  loss: number
}

/** What each assigned word costs, for sorting the lexicon by suspicion. */
export function cardsOf(bench: Bench): Array<Card> {
  const out: Array<Card> = []
  for (let at = 0; at < bench.board.forms.length; at++) {
    const meaning = bench.board.meaning[at]
    if (!meaning) continue
    const own = ownLoss(bench, at)
    const pair = pairLoss(bench, at) / 2
    out.push({
      word: bench.board.forms[at],
      meaning,
      tier: bench.board.tier[at],
      shape: bench.tables.shape[at],
      echo: echoScore(bench.board.forms[at], meaning),
      own,
      pair,
      loss: own + pair,
    })
  }
  return out
}
