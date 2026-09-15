/**
 * Ranks the 4,096 systems, and shows the arithmetic behind each one.
 *
 * ── Why any of them come to exactly 4,096 ──────────────
 *
 * The count is a closed form, and that is the whole trick. Every
 * opening is worth the same amount, because the rules never look at the
 * opening and the closing together. So a shape's count is
 *
 *   openings x (what one opening buys)
 *
 * and what one opening buys is every vowel and closing pair that the
 * blurred rhyme rule leaves alone.
 *
 *   P(close) = 5|close| - 3|close on l or r|
 *   P(coda)  = 5|coda|  - 3|coda opening on l or r|
 *
 * The 3 is there because `il` `el` `ir` `er` `ul` `ur` block three of
 * the five vowels for a closing that is or begins on a liquid. Only `a`
 * and `o` are left before a liquid.
 *
 *   CVC   = |open|  x P(close)
 *   CVCC  = |open|  x P(coda)
 *   CCVC  = |onset| x P(close)
 *
 *   all   = (|open| + |onset|) x P(close) + |open| x P(coda)
 *
 * Four numbers decide everything: how many openings, how many closings,
 * how many onset clusters, how many coda clusters, plus how many of the
 * closings and codas ride on a liquid. WHICH sounds they are never
 * enters into it. So the search is over those few numbers, every hit is
 * exact rather than approximate, and naming actual sounds comes after.
 * A taboo form is not a product, so it is subtracted flat: the screen
 * refuses a fixed handful of forms after the arithmetic is done, and
 * `refused` in `index.csv` is that count.
 *
 * That is why there are dozens of answers and not one.
 *
 * ── Beauty ─────────────────────────────────────────────
 *
 * Beauty is scored rather than asserted, on five things a person can
 * check. Each runs 0 to 1 and the weights are stated in `WEIGHTS`.
 *
 *   even       the three shapes come out near the same size
 *   one_rule   openings and closings lose the SAME sounds, so the cut
 *              is one rule stated once and not two
 *   marked     only the marked sounds go, x j c C, and never a liquid
 *   family     the clusters that go form whole families
 *   lean       how many distinct words survive the closeness pass
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/rank.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { MARKED_ONSETS, MARKED_SOUNDS, opensOnLiquid } from './house'

const here = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(here, '../../../base/v4/4096/01-drop-clusters')

const LIQUIDS = ['l', 'r']

const WEIGHTS = {
  even: 3,
  one_rule: 3,
  marked: 4,
  family: 2,
  lean: 1,
}

// ─── Read What Was Written ──────────────────────────────

type Row = {
  variant: string
  cvc: number
  cvcc: number
  ccvc: number
  all: number
  lean: number
  open: number
  close: number
  onset: number
  coda: number
  codaLiquid: number
  pClose: number
  pCoda: number
  refused: number
  dropOpen: Array<string>
  dropClose: Array<string>
  dropOnset: Array<string>
  dropCoda: Array<string>
}

const lines = readFileSync(resolve(DIR, 'index.csv'), 'utf-8')
  .split('\n')
  .slice(1)
  .filter(Boolean)

const rows: Array<Row> = lines.map(line => {
  const c = line.split(',')
  const words = (s: string) => (s ? s.split(' ').filter(Boolean) : [])
  return {
    variant: c[0],
    cvc: Number(c[1]),
    cvcc: Number(c[2]),
    ccvc: Number(c[3]),
    all: Number(c[4]),
    lean: Number(c[5]),
    open: Number(c[6]),
    close: Number(c[7]),
    onset: Number(c[8]),
    coda: Number(c[9]),
    codaLiquid: Number(c[10]),
    pClose: Number(c[11]),
    pCoda: Number(c[12]),
    refused: Number(c[13]),
    dropOpen: words(c[14]),
    dropClose: words(c[15]),
    dropOnset: words(c[16]),
    dropCoda: words(c[17]),
  }
})

// ─── The Closed Form, Checked ───────────────────────────

console.log('How each one comes to 4,096')
console.log('')
console.log('| n | open | onset | P(close) | coda | P(coda) | refused | the sum |')
console.log('| ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |')

for (const row of rows) {
  const said =
    (row.open + row.onset) * row.pClose + row.open * row.pCoda - row.refused

  if (said !== row.all || said !== 4096) {
    throw new Error(`${row.variant}: closed form gives ${said}`)
  }

  console.log(
    `| ${row.variant} | ${row.open} | ${row.onset} | ${row.pClose} | ` +
      `${row.coda} | ${row.pCoda} | ${row.refused} | ` +
      `(${row.open} + ${row.onset}) x ${row.pClose} + ` +
      `${row.open} x ${row.pCoda} - ${row.refused} = 4,096 |`,
  )
}

console.log('')
console.log('Every row is the same identity, so the search only ever had')
console.log('to try whole numbers rather than build any words.')
console.log('')

// ─── Scoring ────────────────────────────────────────────

function same(a: Array<string>, b: Array<string>): boolean {
  if (a.length !== b.length) return false
  const set = new Set(b)
  return a.every(x => set.has(x))
}

/** A family is all of a named group, or none of it. */
function whole(dropped: Array<string>, family: Array<string>): boolean {
  const inFamily = dropped.filter(c => family.includes(c))
  return inFamily.length === 0 || inFamily.length === family.length
}

const CODA_FAMILIES = [
  ['mp', 'nt', 'nd', 'qk'],
  ['sk', 'sp', 'st'],
  ['ps', 'ks', 'ts', 'dz', 'bz', 'gz'],
  ['rp', 'rb', 'rf', 'rv', 'rs', 'rz', 'rt', 'rd', 'rk', 'rg'],
  ['lp', 'lb', 'lf', 'lv', 'ls', 'lz', 'lt', 'lc', 'ld', 'lk'],
]

const leanHigh = Math.max(...rows.map(r => r.lean))
const leanLow = Math.min(...rows.map(r => r.lean))

type Scored = Row & {
  even: number
  oneRule: number
  marked: number
  family: number
  leanScore: number
  beauty: number
  why: string
}

const scored: Array<Scored> = rows.map(row => {
  const shapes = [row.cvc, row.cvcc, row.ccvc]
  const spread = (Math.max(...shapes) - Math.min(...shapes)) / row.all
  const even = Math.max(0, 1 - spread * 3)

  const oneRule =
    same(row.dropOpen, row.dropClose) ||
    row.dropOpen.length === 0 ||
    row.dropClose.length === 0
      ? 1
      : 0

  const touched = [...row.dropOpen, ...row.dropClose]
  const liquidsHit = touched.filter(c => LIQUIDS.includes(c)).length
  const unmarked = touched.filter(
    c => !MARKED_SOUNDS.includes(c) && !LIQUIDS.includes(c),
  ).length
  const marked = Math.max(0, 1 - liquidsHit * 0.35 - unmarked * 0.2)

  const onsetWhole = whole(row.dropOnset, MARKED_ONSETS) ? 1 : 0
  const codaWhole = CODA_FAMILIES.every(f => whole(row.dropCoda, f)) ? 1 : 0
  const family = (onsetWhole + codaWhole) / 2

  const leanScore =
    leanHigh === leanLow ? 1 : (row.lean - leanLow) / (leanHigh - leanLow)

  const beauty =
    (even * WEIGHTS.even +
      oneRule * WEIGHTS.one_rule +
      marked * WEIGHTS.marked +
      family * WEIGHTS.family +
      leanScore * WEIGHTS.lean) /
    (WEIGHTS.even +
      WEIGHTS.one_rule +
      WEIGHTS.marked +
      WEIGHTS.family +
      WEIGHTS.lean)

  const why = [
    liquidsHit > 0 ? `loses ${liquidsHit} liquid as an opening or closing` : '',
    oneRule ? 'one cut, stated once' : 'openings and closings cut differently',
    onsetWhole ? '' : 'breaks an onset family',
    codaWhole ? '' : 'breaks a coda family',
    spread < 0.1 ? 'shapes near even' : spread > 0.2 ? 'shapes lopsided' : '',
  ]
    .filter(Boolean)
    .join('; ')

  return { ...row, even, oneRule, marked, family, leanScore, beauty, why }
})

scored.sort((a, b) => b.beauty - a.beauty)

console.log('Ranked most beautiful to least')
console.log('')
console.log(
  '| rank | n | beauty | even | one rule | marked | family | lean | why |',
)
console.log('| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |')

for (let i = 0; i < scored.length; i++) {
  const s = scored[i]
  console.log(
    `| ${i + 1} | ${s.variant} | ${s.beauty.toFixed(2)} | ` +
      `${s.even.toFixed(2)} | ${s.oneRule} | ${s.marked.toFixed(2)} | ` +
      `${s.family.toFixed(2)} | ${s.lean} | ${s.why} |`,
  )
}

writeFileSync(
  resolve(DIR, 'beauty.csv'),
  [
    'rank,variant,beauty,even,one_rule,marked,family,lean,why',
    ...scored.map((s, i) =>
      [
        i + 1,
        s.variant,
        s.beauty.toFixed(3),
        s.even.toFixed(3),
        s.oneRule,
        s.marked.toFixed(3),
        s.family.toFixed(3),
        s.lean,
        `"${s.why}"`,
      ].join(','),
    ),
  ].join('\n') + '\n',
)

console.log('')
console.log(`wrote ${resolve(DIR, 'beauty.csv')}`)
