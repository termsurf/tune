/**
 * Which totals each shape can actually reach, and which splits pair up.
 *
 * Fixing a shape at a number is only interesting if the number is
 * reachable WITH ROOM LEFT. `CCVC` at 1,536 needs all 24 onset clusters
 * against a full `P(close)`, so nothing about `CCVC` can be thinned
 * afterwards while the other two shapes are being shaped. That is a
 * corner, not a design.
 *
 * So this reports the whole reachable set per shape, with how much was
 * turned to get there, rather than answering one target at a time.
 *
 *   headroom   how far the shape's count sits below what it could be
 *              if nothing at all were turned. A split with headroom on
 *              every shape can still be shaped afterwards. A split that
 *              pins a shape at its ceiling cannot.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/sweep.ts
 *   pnpm --dir deck/tune exec tsx make/v4/code/sweep.ts --cvc 1024
 *   pnpm --dir deck/tune exec tsx make/v4/code/sweep.ts --cvc 1024 --by 64
 */

import { SHAPES, type Shape } from './sound'
import { run, tally, withPlan, type Echo, type Plan } from './plan'
import {
  HOUSE,
  MARKED_CODAS,
  MARKED_ONSETS,
  MARKED_SOUNDS,
  SOUND_RANK_MAP,
  opensOnLiquid,
} from './house'
import { RULES, type Rule } from './rule'

const TARGET = 4096

const argv = process.argv.slice(2)
function asked(flag: string, fallback: number): number {
  const at = argv.indexOf(flag)
  return at >= 0 ? Number(argv[at + 1]) : fallback
}

const FIX_CVC = asked('--cvc', 0)
const BY = asked('--by', 64)

const ECHOES: Array<Echo> = ['none', 'same', 'similar']

type Sieve = { mod: number; keep: Array<number> } | null

const SIEVES: Array<Sieve> = [null]
for (let mod = 2; mod <= 6; mod++) {
  for (let keep = 1; keep < mod; keep++) {
    SIEVES.push({ mod, keep: Array.from({ length: keep }, (_, i) => i) })
  }
}

function order(list: Array<string>, first: Array<string>): Array<string> {
  const marked = list
    .filter(c => first.includes(c))
    .sort((a, b) => first.indexOf(a) - first.indexOf(b))
  return [...marked, ...[...list].reverse().filter(c => !first.includes(c))]
}

const openOrder = order(HOUSE.open, MARKED_SOUNDS)
const closeOrder = order(HOUSE.close, MARKED_SOUNDS)
const onsetOrder = order(HOUSE.onset, MARKED_ONSETS)
const liquidOrder = order(HOUSE.coda.filter(opensOnLiquid), MARKED_CODAS)
const otherOrder = order(HOUSE.coda.filter(c => !opensOnLiquid(c)), MARKED_CODAS)

function keepFrom(pool: Array<string>, dropped: Array<string>): Array<string> {
  const gone = new Set(dropped)
  return pool.filter(c => !gone.has(c))
}

type Way = {
  openDrop: number
  closeDrop: number
  onsetDrop: number
  liquidDrop: number
  otherDrop: number
  rule: Rule | null
  echo: Echo
  sieve: Sieve
  moved: number
}

function planOf(shape: Shape, way: Way): Plan {
  return withPlan(HOUSE, {
    open: keepFrom(HOUSE.open, openOrder.slice(0, way.openDrop)),
    close: keepFrom(HOUSE.close, closeOrder.slice(0, way.closeDrop)),
    onset: keepFrom(HOUSE.onset, onsetOrder.slice(0, way.onsetDrop)),
    coda: keepFrom(HOUSE.coda, [
      ...liquidOrder.slice(0, way.liquidDrop),
      ...otherOrder.slice(0, way.otherDrop),
    ]),
    bar: way.rule ? [way.rule.bar] : [],
    echo: way.echo,
    sieve: way.sieve ? { ...way.sieve, rank: SOUND_RANK_MAP } : null,
    shapes: [shape],
  })
}

// ─── The Ceiling ────────────────────────────────────────

const base = run(HOUSE)
const ceiling: Record<Shape, number> = {
  CVC: base.count.full.CVC,
  CVCC: base.count.full.CVCC,
  CCVC: base.count.full.CCVC,
}

console.log(
  `with nothing turned: CVC ${ceiling.CVC}, CVCC ${ceiling.CVCC}, ` +
    `CCVC ${ceiling.CCVC}, all ${base.count.fullAll}`,
)
console.log('')

// ─── Reachable Sets ─────────────────────────────────────

const liquidCount = HOUSE.coda.filter(opensOnLiquid).length
const otherCount = HOUSE.coda.length - liquidCount

const reach: Record<Shape, Map<number, Way>> = {
  CVC: new Map(),
  CVCC: new Map(),
  CCVC: new Map(),
}

const started = Date.now()

for (const shape of SHAPES) {
  const openMax = shape === 'CCVC' ? 0 : 7
  const closeMax = shape === 'CVCC' ? 0 : 7
  const onsetMax = shape === 'CCVC' ? HOUSE.onset.length - 3 : 0
  const liquidMax = shape === 'CVCC' ? liquidCount : 0
  const otherMax = shape === 'CVCC' ? otherCount : 0

  const rules: Array<Rule | null> = [
    null,
    ...RULES.filter(r => r.bar.shape === shape),
  ]

  for (let openDrop = 0; openDrop <= openMax; openDrop++)
  for (let closeDrop = 0; closeDrop <= closeMax; closeDrop++)
  for (let onsetDrop = 0; onsetDrop <= onsetMax; onsetDrop++)
  for (let liquidDrop = 0; liquidDrop <= liquidMax; liquidDrop++)
  for (let otherDrop = 0; otherDrop <= otherMax; otherDrop++)
  for (const rule of rules)
  for (const echo of ECHOES)
  for (const sieve of SIEVES) {
    const way: Way = {
      openDrop, closeDrop, onsetDrop, liquidDrop, otherDrop,
      rule, echo, sieve,
      moved:
        openDrop + closeDrop + onsetDrop + liquidDrop + otherDrop +
        (rule ? 1 : 0) + (echo === 'none' ? 0 : 1) + (sieve ? 1 : 0),
    }
    const got = tally(planOf(shape, way), shape)
    const had = reach[shape].get(got)
    if (!had || way.moved < had.moved) {
      reach[shape].set(got, way)
    }
  }

  console.log(
    `${shape} can reach ${reach[shape].size.toLocaleString()} different totals`,
  )
}

console.log('')
console.log(`swept in ${Date.now() - started}ms`)
console.log('')

// ─── Pair Them Up ───────────────────────────────────────

type Split = {
  cvc: number
  cvcc: number
  ccvc: number
  moved: number
  headroom: number
  tightest: number
}

const splits: Array<Split> = []

for (const [cvc, wayA] of reach.CVC) {
  if (FIX_CVC && cvc !== FIX_CVC) continue
  if (cvc % BY !== 0) continue

  for (const [ccvc, wayC] of reach.CCVC) {
    if (ccvc % BY !== 0) continue
    const cvcc = TARGET - cvc - ccvc
    if (cvcc <= 0 || cvcc % BY !== 0) continue
    const wayB = reach.CVCC.get(cvcc)
    if (!wayB) continue

    /** How far each shape sits below its own ceiling, as a share. */
    const slack = [
      1 - cvc / ceiling.CVC,
      1 - cvcc / ceiling.CVCC,
      1 - ccvc / ceiling.CCVC,
    ]

    splits.push({
      cvc,
      cvcc,
      ccvc,
      moved: wayA.moved + wayB.moved + wayC.moved,
      headroom: slack.reduce((n, s) => n + s, 0) / 3,
      tightest: Math.min(...slack),
    })
  }
}

/** Most room on the shape with the least room, first. */
splits.sort((a, b) => {
  if (b.tightest !== a.tightest) {
    return b.tightest - a.tightest
  }
  return a.moved - b.moved
})

console.log(
  `${splits.length} splits of ${TARGET} where every shape divides by ${BY}` +
    (FIX_CVC ? ` and CVC is exactly ${FIX_CVC}` : ''),
)
console.log('')
console.log('| CVC | CVCC | CCVC | in 64ths | tightest headroom | turned |')
console.log('| ---: | ---: | ---: | :--- | ---: | ---: |')

for (const s of splits.slice(0, 20)) {
  const sixty = `${s.cvc / 64} + ${s.cvcc / 64} + ${s.ccvc / 64}`
  console.log(
    `| ${s.cvc} | ${s.cvcc} | ${s.ccvc} | ${sixty} | ` +
      `${(s.tightest * 100).toFixed(1)}% | ${s.moved} |`,
  )
}
