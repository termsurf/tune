/**
 * Does the lexicon actually do what `system/sound.md` says it does?
 *
 * `sound.md` makes specific, falsifiable claims. `m` is positive and `n`
 * is negative. `i` is high and bright, `u` is low and dark. `c` is
 * thought and `C` is relation.
 *
 * **Those are testable against 1,267 words chosen by hand**, and nothing
 * had ever tested them. This does, one claim at a time, because the
 * composite vibe score failed its control and a composite that fails
 * tells you nothing about which of its parts is wrong.
 *
 * ## How
 *
 * For each sound and each axis, compare the mean axis value of the
 * concepts whose word CONTAINS that sound against those that do not.
 * A real effect shows as a gap in the direction the doc predicts.
 *
 * ## What a null result means
 *
 * Not that the claim is false. It may be true of the words you chose
 * deliberately and diluted by the ones filled in around them, or true in
 * a position (opening, closing) rather than anywhere in the word. It
 * means **this lexicon does not yet carry the claim**, which is a fact
 * worth knowing before a search is told to enforce it.
 */

import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import { TERM } from './board'
import {
  AXES,
  Axis,
  SOUND_VIBE,
  conceptVibe,
  useReadings,
  vibeLoss,
} from './vibe'

type Row = { word: string; meaning: string }

function readLexicon(): Array<Row> {
  const rows: Array<Record<string, string>> = parse(
    readFileSync(resolve(TERM, 'base.csv'), 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows
    .map(r => ({
      word: (r.word ?? '').trim(),
      meaning: (r.meaning ?? '').trim(),
    }))
    .filter(r => r.word && r.meaning)
}

export type Test = {
  sound: string
  axis: Axis
  predicted: number
  withMean: number
  withoutMean: number
  gap: number
  n: number
  holds: boolean
}

/**
 * Which half of the lexicon to read.
 *
 * **Keeping only the readings that hold and then showing the score
 * separates is circular**, because the readings were chosen to make it
 * separate. So the lexicon is split by row parity, the readings are
 * fitted on one half, and the separation is measured on the other.
 *
 * Parity rather than a shuffle, so the split is the same every run
 * without a seed.
 */
export type Half = 'all' | 'fit' | 'test'

function inHalf(index: number, half: Half): boolean {
  if (half === 'all') return true
  return half === 'fit' ? index % 2 === 0 : index % 2 === 1
}

/** Every claim `sound.md` makes that this can check. */
export function testClaims(
  where: 'anywhere' | 'open' | 'close',
  half: Half = 'all',
): Array<Test> {
  const rows = readLexicon().filter((_, i) => inHalf(i, half))

  const tagged = rows.map(r => ({
    ...r,
    ...conceptVibe(r.meaning),
  }))

  const out: Array<Test> = []

  for (const [sound, vibe] of Object.entries(SOUND_VIBE)) {
    for (const axis of AXES) {
      const predicted = vibe[axis]
      if (Math.abs(predicted) < 0.4) continue

      let withSum = 0
      let withN = 0
      let withoutSum = 0
      let withoutN = 0

      for (const row of tagged) {
        if (!row.said.has(axis)) continue
        const has =
          where === 'anywhere'
            ? row.word.includes(sound)
            : where === 'open'
              ? row.word[0] === sound
              : row.word[row.word.length - 1] === sound
        if (has) {
          withSum += row.want[axis]
          withN++
        } else {
          withoutSum += row.want[axis]
          withoutN++
        }
      }

      if (withN < 6) continue

      const withMean = withSum / withN
      const withoutMean = withoutSum / Math.max(1, withoutN)
      const gap = withMean - withoutMean

      out.push({
        sound,
        axis,
        predicted,
        withMean,
        withoutMean,
        gap,
        n: withN,
        holds: Math.sign(gap) === Math.sign(predicted) && Math.abs(gap) > 0.08,
      })
    }
  }

  return out.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
}

/**
 * The readings that survive, as a filter over `SOUND_VIBE`.
 *
 * A sound keeps its value on an axis only where the lexicon agrees with
 * the direction `sound.md` predicts. Everything else is zeroed, which
 * means the term stops having an opinion rather than having a wrong one.
 */
export function heldReadings(half: Half = 'fit'): Set<string> {
  const keep = new Set<string>()
  for (const t of testClaims('anywhere', half)) {
    if (t.holds) {
      keep.add(`${t.sound}|${t.axis}`)
    }
  }
  return keep
}

export function report(): string {
  const lines: Array<string> = []

  for (const where of ['anywhere', 'open', 'close'] as const) {
    const tests = testClaims(where)
    const held = tests.filter(t => t.holds)
    const against = tests.filter(
      t => Math.sign(t.gap) !== Math.sign(t.predicted) && Math.abs(t.gap) > 0.08,
    )

    lines.push('')
    lines.push(
      `  ${where.toUpperCase()}  ${held.length} of ${tests.length} claims hold, ${against.length} run backwards`,
    )
    lines.push('')
    lines.push('    sound  axis      says    found   n    verdict')
    for (const t of tests.slice(0, 12)) {
      const verdict = t.holds
        ? 'holds'
        : Math.sign(t.gap) !== Math.sign(t.predicted) && Math.abs(t.gap) > 0.08
          ? 'BACKWARDS'
          : 'flat'
      lines.push(
        `    ${t.sound.padEnd(6)} ${t.axis.padEnd(9)} ` +
          `${t.predicted > 0 ? '+' : '-'}      ` +
          `${t.gap >= 0 ? '+' : ''}${t.gap.toFixed(2).padStart(5)}  ` +
          `${String(t.n).padStart(4)}  ${verdict}`,
      )
    }
  }

  return lines.join('\n')
}

/**
 * Fit the readings on one half of the lexicon, measure on the other.
 *
 * The number that matters is the HELD-OUT one. A fit always looks good
 * on the words it was fitted to.
 */
export function fitReport(): string {
  const lines: Array<string> = []
  const rows = readLexicon()

  const keep = heldReadings('fit')
  lines.push('')
  lines.push(`  fitted on the even rows, ${keep.size} readings survived:`)
  lines.push(`    ${[...keep].sort().join('  ')}`)

  const measure = (half: Half, use: Set<string> | null): number => {
    useReadings(use)
    const here = rows.filter((_, i) =>
      half === 'all' ? true : half === 'fit' ? i % 2 === 0 : i % 2 === 1,
    )
    const loud = here.filter(r => conceptVibe(r.meaning).said.size > 0)
    if (loud.length === 0) return 0
    const mine =
      loud.reduce((sum, r) => sum + vibeLoss(r.word, r.meaning), 0) /
      loud.length
    // The same concepts against a deterministic rotation of the forms,
    // which is a shuffle that needs no seed.
    const shifted =
      loud.reduce(
        (sum, r, i) =>
          sum + vibeLoss(loud[(i + 337) % loud.length].word, r.meaning),
        0,
      ) / loud.length
    return shifted - mine
  }

  lines.push('')
  lines.push('  separation from chance (higher is better, 0 is noise)')
  lines.push('')
  lines.push(
    `    every reading, held-out half      ${measure('test', null).toFixed(4)}`,
  )
  lines.push(
    `    fitted readings, FITTED half      ${measure('fit', keep).toFixed(4)}   <- flattering, ignore`,
  )
  lines.push(
    `    fitted readings, HELD-OUT half    ${measure('test', keep).toFixed(4)}   <- the real number`,
  )
  useReadings(null)
  return lines.join('\n')
}

if (process.argv[1]?.endsWith('claim.ts')) {
  process.stdout.write(`${report()}\n`)
}
