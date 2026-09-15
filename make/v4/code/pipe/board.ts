/**
 * The state the search moves, and the files it is read from.
 *
 * The genome is indexed by FORM, not by concept, which is the change
 * argued for in `note/tune/pipeline/fitness.md`. One array then carries
 * both searches at once:
 *
 *   swap two positions              the assignment search
 *   write a new concept at one      the ontology search
 *
 * The 4,096 forms never move. Only what sits on them moves.
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { compareWords } from '../sound'

const here = dirname(fileURLToPath(import.meta.url))
export const TERM = resolve(here, '../../../../base/v4/term')

// ─── Tiers ──────────────────────────────────────────────

/**
 * How hard a word is to move.
 *
 *   0  frozen.csv, never moves, for any reason
 *   1  assigned by hand, moves only by an argued proposal
 *   4  empty, moves freely
 *
 * Tiers 2 and 3 are earned later by surviving challenges. See
 * `note/tune/pipeline/state.md`.
 */
export type Tier = 0 | 1 | 2 | 3 | 4

export type Slot = {
  /** Index into `forms`, and the identity of the slot. */
  at: number
  word: string
  shape: string
  meaning: string
  tier: Tier
}

export type Board = {
  forms: Array<string>
  /** Meaning sitting on each form, parallel to `forms`. Empty is free. */
  meaning: Array<string>
  tier: Array<Tier>
  /** Where a meaning currently sits, for the reverse lookup. */
  at: Map<string, number>
}

function readCsv(file: string): Array<Record<string, string>> {
  return parse(readFileSync(file, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  })
}

/**
 * Reads `base.csv` and `frozen.csv` into a board.
 *
 * `base.csv` is generated and holds all 4,096 forms in tone order, with
 * a meaning on the ones that have one. `frozen.csv` names the tier 0
 * set by MEANING, and the form is looked up here so the two files cannot
 * drift apart.
 */
export function readBoard(): Board {
  const rows = readCsv(resolve(TERM, 'base.csv'))
  const forms: Array<string> = []
  const meaning: Array<string> = []
  for (const row of rows) {
    const word = (row.word ?? '').trim()
    if (!word) continue
    forms.push(word)
    meaning.push((row.meaning ?? '').trim())
  }

  const tier: Array<Tier> = meaning.map(m => (m ? 1 : 4))
  const at = new Map<string, number>()
  for (let i = 0; i < forms.length; i++) {
    if (meaning[i]) {
      at.set(meaning[i], i)
    }
  }

  const frozenFile = resolve(TERM, 'frozen.csv')
  if (existsSync(frozenFile)) {
    const byWord = new Map(forms.map((w, i) => [w, i]))
    for (const row of readCsv(frozenFile)) {
      const word = (row.word ?? '').trim()
      const says = (row.meaning ?? '').trim()
      const i = byWord.get(word)
      if (i === undefined) {
        throw new Error(`frozen.csv names ${word}, which is not a form`)
      }
      if (meaning[i] !== says) {
        throw new Error(
          `frozen.csv says ${word} is "${says}", base.csv says "${meaning[i]}"`,
        )
      }
      tier[i] = 0
    }
  }

  return { forms, meaning, tier, at }
}

// ─── Reading the board ──────────────────────────────────

export function slotsOf(board: Board): Array<Slot> {
  return board.forms.map((word, at) => ({
    at,
    word,
    shape: shapeOf(word),
    meaning: board.meaning[at],
    tier: board.tier[at],
  }))
}

export function shapeOf(word: string): string {
  if (word.length === 3) return 'CVC'
  return /[aeiou]/.test(word[1]) ? 'CVCC' : 'CCVC'
}

/** Positions the search may touch without arguing for it. */
export function freeAt(board: Board): Array<number> {
  const out: Array<number> = []
  for (let i = 0; i < board.tier.length; i++) {
    if (board.tier[i] >= 4) {
      out.push(i)
    }
  }
  return out
}

/** Positions carrying a meaning, which is what the score reads. */
export function takenAt(board: Board): Array<number> {
  const out: Array<number> = []
  for (let i = 0; i < board.meaning.length; i++) {
    if (board.meaning[i]) {
      out.push(i)
    }
  }
  return out
}

// ─── Moving ─────────────────────────────────────────────

export type Move =
  | { kind: 'swap'; a: number; b: number }
  | { kind: 'place'; at: number; meaning: string }
  | { kind: 'clear'; at: number }

/** Whether a move is allowed at all. Tier 0 is never allowed. */
export function isLegal(board: Board, move: Move): boolean {
  switch (move.kind) {
    case 'swap':
      return board.tier[move.a] > 0 && board.tier[move.b] > 0
    case 'place':
      return board.tier[move.at] > 0
    case 'clear':
      return board.tier[move.at] > 0
  }
}

export function apply(board: Board, move: Move): void {
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

/** Every move has an exact inverse, which is what lets a search back out. */
export function undo(board: Board, move: Move, before: Array<string>): void {
  for (const at of touched(move)) {
    const was = board.meaning[at]
    if (was) board.at.delete(was)
  }
  for (const at of touched(move)) {
    board.meaning[at] = before[at] ?? ''
    if (board.meaning[at]) {
      board.at.set(board.meaning[at], at)
    }
  }
}

export function touched(move: Move): Array<number> {
  switch (move.kind) {
    case 'swap':
      return [move.a, move.b]
    case 'place':
    case 'clear':
      return [move.at]
  }
}

export { compareWords }
