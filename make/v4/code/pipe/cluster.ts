/**
 * Does the shape of a word predict its MEANING, in the lexicon that
 * exists?
 *
 * Every scoring term tried so far has come from `sound.md`, which is a
 * theory about what each sound is for, and both have failed their
 * controls. This asks the opposite question, of the data rather than the
 * theory:
 *
 *   Ignore what the sounds are supposed to mean. Do words that SHARE a
 *   sound in a position actually mean related things, more than two
 *   words picked at random do?
 *
 * **This is the strongest untested hypothesis in the project.** If
 * choosing by feel produced consistent sound-to-domain associations,
 * they are learnable from 1,267 examples and they would rank
 * assignments, which nothing currently does. If it did not, then the
 * feel is genuinely per-word and no statistical objective is coming, and
 * the machine should stop trying to learn taste and start executing
 * stated rules like `enact`.
 *
 * Either answer settles what to build next, which is why it is worth
 * measuring before building anything else.
 */

import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import { TERM } from './board'
import { AXES, conceptVibe } from './vibe'
import { stream } from './search'
import { isVowel } from '../sound'

type Word = {
  word: string
  meaning: string
  want: Record<string, number>
  said: Set<string>
}

function readTagged(): Array<Word> {
  const rows: Array<Record<string, string>> = parse(
    readFileSync(resolve(TERM, 'base.csv'), 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  const out: Array<Word> = []
  for (const row of rows) {
    const word = (row.word ?? '').trim()
    const meaning = (row.meaning ?? '').trim()
    if (!word || !meaning) continue
    const { want, said } = conceptVibe(meaning)
    if (said.size === 0) continue
    out.push({ word, meaning, want, said: said as Set<string> })
  }
  return out
}

/**
 * How alike two concepts are, over the axes they BOTH speak to.
 *
 * Pairs with no shared axis are skipped rather than scored zero, because
 * "neither said anything comparable" is not "they disagree".
 */
function likeness(a: Word, b: Word): number | null {
  const shared = [...a.said].filter(axis => b.said.has(axis))
  if (shared.length === 0) {
    return null
  }
  let sum = 0
  for (const axis of shared) {
    sum += 1 - Math.abs(a.want[axis] - b.want[axis]) / 2
  }
  return sum / shared.length
}

function partOf(word: string, where: 'open' | 'close' | 'vowel'): string {
  const sounds = word.split('')
  const at = sounds.findIndex(isVowel)
  if (where === 'vowel') return at >= 0 ? sounds[at] : ''
  if (where === 'open') return sounds.slice(0, Math.max(1, at)).join('')
  return sounds.slice(at + 1).join('')
}

export type Clustering = {
  where: string
  shared: number
  sharedPairs: number
  apart: number
  apartPairs: number
  lift: number
}

/**
 * Compares concepts that share a sound against ones that do not.
 *
 * `lift` above zero means words sharing that position mean more similar
 * things than chance. That is the signal a placement rule would be built
 * on.
 */
export function clustering(): Array<Clustering> {
  const words = readTagged()
  const out: Array<Clustering> = []

  for (const where of ['open', 'close', 'vowel'] as const) {
    let sharedSum = 0
    let sharedN = 0
    let apartSum = 0
    let apartN = 0

    // Every pair is too many at 1,267; a deterministic sample of pairs
    // is plenty and keeps the run instant.
    const next = stream(20260915)
    const tries = 400000
    for (let t = 0; t < tries; t++) {
      const i = Math.floor(next() * words.length) % words.length
      const j = Math.floor(next() * words.length) % words.length
      if (i === j) continue
      const score = likeness(words[i], words[j])
      if (score === null) continue
      if (partOf(words[i].word, where) === partOf(words[j].word, where)) {
        sharedSum += score
        sharedN++
      } else {
        apartSum += score
        apartN++
      }
    }

    const shared = sharedN > 0 ? sharedSum / sharedN : 0
    const apart = apartN > 0 ? apartSum / apartN : 0
    out.push({
      where,
      shared,
      sharedPairs: sharedN,
      apart,
      apartPairs: apartN,
      lift: shared - apart,
    })
  }

  return out
}

export function report(): string {
  const lines: Array<string> = []
  lines.push('')
  lines.push('  Do words sharing a sound mean related things?')
  lines.push('')
  lines.push('  position  sharing   not sharing   lift     pairs')
  for (const row of clustering()) {
    lines.push(
      `  ${row.where.padEnd(9)} ${row.shared.toFixed(4)}    ${row.apart.toFixed(4)}      ` +
        `${row.lift >= 0 ? '+' : ''}${row.lift.toFixed(4)}  ${row.sharedPairs}`,
    )
  }
  lines.push('')
  lines.push('  A lift near zero means the shape of a word says nothing about')
  lines.push('  its meaning in this lexicon, and no statistical objective is')
  lines.push('  going to rank assignments. A clear lift is a placement rule.')
  return lines.join('\n')
}

if (process.argv[1]?.endsWith('cluster.ts')) {
  process.stdout.write(`${report()}\n`)
}

export { AXES }
