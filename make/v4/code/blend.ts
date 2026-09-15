/**
 * 4,096 with the number magic AND the frequency shape at once.
 *
 * Pattern 03 makes the three shape counts come out to round numbers.
 * Pattern 04 makes the sounds turn up as often as they should. Neither
 * has to give anything up for the other, because they work on different
 * things: 03 decides HOW MANY words each shape gets, and 04 decides
 * WHICH words those are.
 *
 * So this blends them.
 *
 *   1. split 4,096 into three shape counts, each divisible by a chosen
 *      power of two, and each inside what the shape can actually supply
 *   2. within each shape, take exactly that many words by the frequency
 *      picker in `pick.ts`
 *
 * The split is exact by arithmetic and the count is exact by
 * construction, so nothing is searched for and nothing is approximate.
 * The whole inventory is kept, every sound reaches a word, and the
 * frequency profile is reported rather than claimed.
 *
 * ── the divisions ──────────────────────────────────────
 *
 * Every split is tried at 256, 64, 16, 8 and 4. A coarser division is
 * a stronger claim, so the coarsest that still works is the one worth
 * having: at 256 the three counts read as sixteenths of 4,096.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/blend.ts
 *   pnpm --dir deck/tune exec tsx make/v4/code/blend.ts --count 8
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { SHAPES, compareWords, type Shape } from './sound'
import { run, type Piece } from './plan'
import { HOUSE } from './house'
import { pickWeighted, WEIGHT } from './pick'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '../../../base/v4/4096/05-blend')

const TARGET = 4096
const DIVISIONS = [256, 64, 16, 8, 4]

const args = process.argv.slice(2)
const countAt = args.indexOf('--count')
const WANT = countAt >= 0 ? Number(args[countAt + 1]) : 6

// ─── What There Is To Pick From ─────────────────────────

const { full, count } = run(HOUSE)

const room: Record<Shape, number> = {
  CVC: full.CVC.length,
  CVCC: full.CVCC.length,
  CCVC: full.CCVC.length,
}

console.log(
  `the whole language is ${count.fullAll.toLocaleString()} words: ` +
    `CVC ${room.CVC}, CVCC ${room.CVCC}, CCVC ${room.CCVC}`,
)
console.log('')

// ─── Splits ─────────────────────────────────────────────

type Split = {
  by: number
  cvc: number
  cvcc: number
  ccvc: number
  marks: Array<string>
}

const splits: Array<Split> = []
const seen = new Set<string>()

for (const by of DIVISIONS) {
  for (let cvc = by; cvc <= room.CVC; cvc += by) {
    for (let cvcc = by; cvcc <= room.CVCC; cvcc += by) {
      const ccvc = TARGET - cvc - cvcc
      if (ccvc < by || ccvc > room.CCVC || ccvc % by !== 0) {
        continue
      }

      const key = `${cvc}|${cvcc}|${ccvc}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)

      const marks: Array<string> = [`every shape divides by ${by}`]
      if (cvc === ccvc) {
        marks.push('the two one cluster shapes balance exactly')
      }
      if (cvcc === cvc + ccvc) {
        marks.push('the cluster closing shape equals the other two together')
      }
      const spread = Math.max(cvc, cvcc, ccvc) - Math.min(cvc, cvcc, ccvc)
      if (spread <= 256) {
        marks.push('the three shapes sit within 256 of each other')
      }

      splits.push({ by, cvc, cvcc, ccvc, marks })
    }
  }
}

/** Coarsest division first, then the most other things true of it. */
splits.sort((a, b) => {
  if (a.by !== b.by) {
    return b.by - a.by
  }
  if (a.marks.length !== b.marks.length) {
    return b.marks.length - a.marks.length
  }
  const spreadA = Math.max(a.cvc, a.cvcc, a.ccvc) - Math.min(a.cvc, a.cvcc, a.ccvc)
  const spreadB = Math.max(b.cvc, b.cvcc, b.ccvc) - Math.min(b.cvc, b.cvcc, b.ccvc)
  return spreadA - spreadB
})

console.log(`${splits.length} splits of ${TARGET} divide cleanly and fit`)
console.log('')

// ─── Build ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const index: Array<string> = [
  'variant,divides_by,cvc,cvcc,ccvc,all,drift,marks',
]

console.log('| n | by | CVC | CVCC | CCVC | all | drift | what is true of it |')
console.log('| ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |')

const chosen = splits.slice(0, WANT)

for (let i = 0; i < chosen.length; i++) {
  const split = chosen[i]

  const want: Record<Shape, number> = {
    CVC: split.cvc,
    CVCC: split.cvcc,
    CCVC: split.ccvc,
  }

  /**
   * Picked per shape, because the split fixes each shape's count and
   * the picker's job is only to choose which words fill it.
   */
  const taken: Record<Shape, Array<Piece>> = {
    CVC: [],
    CVCC: [],
    CCVC: [],
  }

  const everyTaken: Array<Piece> = []
  for (const shape of SHAPES) {
    const got = pickWeighted(full[shape], want[shape])
    taken[shape] = got.taken
    everyTaken.push(...got.taken)
  }

  if (everyTaken.length !== TARGET) {
    throw new Error(`built ${everyTaken.length}, wanted ${TARGET}`)
  }

  /** The profile of the whole thing, not of one shape at a time. */
  const whole = pickWeighted(everyTaken, everyTaken.length)

  const dry = whole.profile.filter(p => p.count === 0)
  if (dry.length > 0) {
    throw new Error(`these sounds reached no word: ${dry.map(p => p.sound).join(' ')}`)
  }

  const nn = String(i + 1).padStart(2, '0')
  const dir = resolve(OUT_DIR, nn)

  for (const shape of SHAPES) {
    const words = taken[shape].map(p => p.word).sort(compareWords)
    write(
      resolve(dir, `${shape.toLowerCase()}.csv`),
      ['word', ...words].join('\n') + '\n',
    )
  }

  write(
    resolve(dir, 'weight.csv'),
    [
      'sound,weight,wanted_share,got_share,words',
      ...whole.profile.map(r =>
        [
          r.sound,
          WEIGHT[r.sound],
          r.want.toFixed(3),
          r.got.toFixed(3),
          r.count,
        ].join(','),
      ),
    ].join('\n') + '\n',
  )

  write(
    resolve(dir, 'plan.csv'),
    [
      'setting,value',
      `divides_by,${split.by}`,
      `cvc,${split.cvc}`,
      `cvcc,${split.cvcc}`,
      `ccvc,${split.ccvc}`,
      `drift,${whole.drift.toFixed(3)}`,
      ...split.marks.map(m => `mark,"${m}"`),
    ].join('\n') + '\n',
  )

  index.push(
    [
      nn,
      split.by,
      split.cvc,
      split.cvcc,
      split.ccvc,
      TARGET,
      whole.drift.toFixed(3),
      `"${split.marks.join('; ')}"`,
    ].join(','),
  )

  console.log(
    `| ${nn} | ${split.by} | ${split.cvc} | ${split.cvcc} | ${split.ccvc} | ` +
      `${TARGET} | ${whole.drift.toFixed(3)} | ${split.marks.join('; ')} |`,
  )
}

write(resolve(OUT_DIR, 'index.csv'), index.join('\n') + '\n')

console.log('')
console.log(`wrote ${OUT_DIR}`)
