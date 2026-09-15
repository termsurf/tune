/**
 * The mirror quartets, and whether the 4,096 still holds them.
 *
 * A mirror pair `A B` makes four words: each consonant opening, each of
 * `i` and `u` between. `base/v4/term/scratchpad/action.md` calls these
 * the most important words in the language, because they are the ones
 * whose structure is VISIBLE in the tone script.
 *
 * ```text
 *         i        u
 *   A-   AiB      AuB
 *   B-   BiA      BuA
 * ```
 *
 * Both diagonals are consonant reversals with a vowel shift, which is
 * the opposition rule in `note/tune/pipeline/philosophy.md`. So a
 * quartet is a closed set of two opposite pairs and has to be settled
 * together.
 *
 * **This check exists because the 4,096 selection cut two of them.**
 * `suz` and `zis` are legal words that the closeness pruning dropped,
 * and nothing noticed, because they carried no meaning at the time and
 * `keep.ts` only protects words that already mean something. A word can
 * be structurally required and semantically empty at the same time, and
 * that is exactly the case the picker cannot see.
 */

import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import { TERM } from './board'
import { MIRROR_PAIRS } from './tone'
import { testWord } from '../sound'

const FULL = resolve(TERM, '../full/cvc.csv')

export type Quartet = {
  pair: [string, string]
  words: Array<{
    word: string
    legal: boolean
    chosen: boolean
    meaning: string
  }>
}

export function quartets(): Array<Quartet> {
  const legal = new Set(
    readFileSync(FULL, 'utf-8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean),
  )

  const rows: Array<Record<string, string>> = parse(
    readFileSync(resolve(TERM, 'base.csv'), 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  const chosen = new Map<string, string>()
  for (const row of rows) {
    const word = (row.word ?? '').trim()
    if (word) {
      chosen.set(word, (row.meaning ?? '').trim())
    }
  }

  return MIRROR_PAIRS.map(([a, b]) => {
    const words: Quartet['words'] = []
    for (const [first, second] of [
      [a, b],
      [b, a],
    ]) {
      for (const vowel of ['i', 'u']) {
        const word = `${first}${vowel}${second}`
        words.push({
          word,
          legal: legal.has(word) && testWord(word).ok,
          chosen: chosen.has(word),
          meaning: chosen.get(word) ?? '',
        })
      }
    }
    return { pair: [a, b] as [string, string], words }
  })
}

/** Legal words the selection dropped, which is the defect worth naming. */
export function missing(): Array<string> {
  const out: Array<string> = []
  for (const q of quartets()) {
    for (const w of q.words) {
      if (w.legal && !w.chosen) {
        out.push(w.word)
      }
    }
  }
  return out
}

export function report(): string {
  const lines: Array<string> = []
  let legal = 0
  let chosen = 0
  let named = 0

  for (const q of quartets()) {
    lines.push(`\n  ${q.pair[0]} ${q.pair[1]}`)
    for (const w of q.words) {
      const mark = !w.legal ? 'refused' : w.chosen ? '' : 'CUT'
      if (w.legal) legal++
      if (w.chosen) chosen++
      if (w.meaning) named++
      lines.push(
        `    ${w.word.padEnd(5)} ${mark.padEnd(8)} ${w.meaning}`,
      )
    }
  }

  lines.push('')
  lines.push(`  legal    ${legal} of 32`)
  lines.push(`  chosen   ${chosen} of ${legal}`)
  lines.push(`  named    ${named} of ${chosen}`)

  const gone = missing()
  if (gone.length) {
    lines.push('')
    lines.push(`  CUT FROM THE 4,096, though legal: ${gone.join(' ')}`)
    lines.push(
      '  These are structurally required and were dropped for carrying',
    )
    lines.push(
      '  no meaning. Add them to keep.ts alongside the meaning-bearing set.',
    )
  }

  return lines.join('\n')
}

if (process.argv[1]?.endsWith('mirror.ts')) {
  process.stdout.write(`${report()}\n`)
}
