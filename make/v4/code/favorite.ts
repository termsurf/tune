/**
 * Every way to reach exactly 1,280 + 1,536 + 1,280.
 *
 *   1280 + 1536 + 1280 = 4096
 *      5 +    6 +    5 = 16 sixteenths
 *
 * `CVC` and `CCVC` balance, every shape is a multiple of 256, and the
 * whole thing is 2^12. This asks what else could produce those three
 * numbers, using any combination of the mechanisms rather than the one
 * route pattern 03 happened to find.
 *
 * ── why the search is small ────────────────────────────
 *
 * **The three shapes never interact**, so this is three separate
 * questions and not one. `CVC` must come to 1,280, `CVCC` to 1,536 and
 * `CCVC` to 1,280, and a way of doing each combines with any way of
 * doing the others. Enumerating them apart and crossing them at the end
 * turns a product of three big searches into a sum of three small ones.
 *
 * ── what it may turn ───────────────────────────────────
 *
 *   pools    how many openings, closings, onset and coda clusters
 *   bar      a family refused at one slot of one shape
 *   echo     no word opens and closes on two similar consonants
 *   sieve    an even thinning by rank sum
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/favorite.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { SHAPES, compareWords, type Shape } from './sound'
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

const here = dirname(fileURLToPath(import.meta.url))

const argv = process.argv.slice(2)

function asked(flag: string, fallback: number): number {
  const at = argv.indexOf(flag)
  return at >= 0 ? Number(argv[at + 1]) : fallback
}

const WANT: Record<Shape, number> = {
  CVC: asked('--cvc', 1280),
  CVCC: asked('--cvcc', 1536),
  CCVC: asked('--ccvc', 1280),
}

const TARGET = WANT.CVC + WANT.CVCC + WANT.CCVC

if (TARGET !== 4096) {
  throw new Error(`${WANT.CVC} + ${WANT.CVCC} + ${WANT.CCVC} is ${TARGET}`)
}

const nameAt = argv.indexOf('--name')
const NAME = nameAt >= 0 ? argv[nameAt + 1] : '06-favorite'
const OUT_DIR = resolve(here, `../../../base/v4/4096/${NAME}`)

const ECHOES: Array<Echo> = ['none', 'same', 'similar']

type Sieve = { mod: number; keep: Array<number> } | null

const SIEVES: Array<Sieve> = [null]
for (let mod = 2; mod <= 6; mod++) {
  for (let keep = 1; keep < mod; keep++) {
    SIEVES.push({ mod, keep: Array.from({ length: keep }, (_, i) => i) })
  }
}

// ─── Pools By Size ──────────────────────────────────────

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
const otherOrder = order(
  HOUSE.coda.filter(c => !opensOnLiquid(c)),
  MARKED_CODAS,
)

function keepFrom(pool: Array<string>, dropped: Array<string>): Array<string> {
  const gone = new Set(dropped)
  return pool.filter(c => !gone.has(c))
}

// ─── One Shape At A Time ────────────────────────────────

type Way = {
  shape: Shape
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

function planOf(way: Way): Plan {
  return withPlan(HOUSE, {
    name: `${way.shape}`,
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
    shapes: [way.shape],
  })
}

const liquidCount = HOUSE.coda.filter(opensOnLiquid).length
const otherCount = HOUSE.coda.length - liquidCount

const ways: Record<Shape, Array<Way>> = { CVC: [], CVCC: [], CCVC: [] }

const started = Date.now()

for (const shape of SHAPES) {
  /** Only pools the shape actually draws on are worth turning. */
  const openMax = shape === 'CCVC' ? 0 : 8
  const closeMax = shape === 'CVCC' ? 0 : 8
  const onsetMax = shape === 'CCVC' ? HOUSE.onset.length - 3 : 0
  const liquidMax = shape === 'CVCC' ? liquidCount : 0
  const otherMax = shape === 'CVCC' ? otherCount : 0

  const rules: Array<Rule | null> = [
    null,
    ...RULES.filter(r => r.bar.shape === shape),
  ]

  for (let openDrop = 0; openDrop <= openMax; openDrop++) {
    for (let closeDrop = 0; closeDrop <= closeMax; closeDrop++) {
      for (let onsetDrop = 0; onsetDrop <= onsetMax; onsetDrop++) {
        for (let liquidDrop = 0; liquidDrop <= liquidMax; liquidDrop++) {
          for (let otherDrop = 0; otherDrop <= otherMax; otherDrop++) {
            for (const rule of rules) {
              for (const echo of ECHOES) {
                for (const sieve of SIEVES) {
                  const way: Way = {
                    shape,
                    openDrop,
                    closeDrop,
                    onsetDrop,
                    liquidDrop,
                    otherDrop,
                    rule,
                    echo,
                    sieve,
                    moved:
                      openDrop +
                      closeDrop +
                      onsetDrop +
                      liquidDrop +
                      otherDrop +
                      (rule ? 1 : 0) +
                      (echo === 'none' ? 0 : 1) +
                      (sieve ? 1 : 0),
                  }
                  if (tally(planOf(way), shape) === WANT[shape]) {
                    ways[shape].push(way)
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  ways[shape].sort((a, b) => a.moved - b.moved)
  console.log(
    `${shape} reaches ${WANT[shape]} in ${ways[shape].length} ways`,
  )
}

console.log('')
console.log(`searched in ${Date.now() - started}ms`)
console.log('')

const total =
  ways.CVC.length * ways.CVCC.length * ways.CCVC.length

console.log(
  `${total.toLocaleString()} whole systems come to ` +
    `${WANT.CVC} + ${WANT.CVCC} + ${WANT.CCVC} = ${TARGET}`,
)
console.log('')

// ─── Write The Cleanest ─────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

function says(way: Way): string {
  const parts: Array<string> = []
  if (way.openDrop) parts.push(`${way.openDrop} openings go`)
  if (way.closeDrop) parts.push(`${way.closeDrop} closings go`)
  if (way.onsetDrop) parts.push(`${way.onsetDrop} onset clusters go`)
  if (way.liquidDrop) parts.push(`${way.liquidDrop} liquid closings go`)
  if (way.otherDrop) parts.push(`${way.otherDrop} other closings go`)
  if (way.rule) parts.push(way.rule.says)
  if (way.echo !== 'none') parts.push(`echo ${way.echo}`)
  if (way.sieve) {
    parts.push(`sieve ${way.sieve.keep.join(' ')} of ${way.sieve.mod}`)
  }
  return parts.join('; ') || 'nothing turned'
}

const index: Array<string> = [
  'variant,cvc,cvcc,ccvc,all,lean,moved,cvc_by,cvcc_by,ccvc_by',
]

console.log('| n | moved | how each shape gets there |')
console.log('| ---: | ---: | :--- |')

let wrote = 0

for (let a = 0; a < Math.min(4, ways.CVC.length); a++) {
  for (let b = 0; b < Math.min(2, ways.CVCC.length); b++) {
    for (let c = 0; c < Math.min(2, ways.CCVC.length); c++) {
      if (wrote >= 8) break

      const picked: Record<Shape, Way> = {
        CVC: ways.CVC[a],
        CVCC: ways.CVCC[b],
        CCVC: ways.CCVC[c],
      }

      const moved = SHAPES.reduce((n, s) => n + picked[s].moved, 0)

      wrote++
      const nn = String(wrote).padStart(2, '0')
      const dir = resolve(OUT_DIR, nn)

      const counts: Record<Shape, number> = { CVC: 0, CVCC: 0, CCVC: 0 }
      let lean = 0

      for (const shape of SHAPES) {
        const { full, count } = run(planOf(picked[shape]))
        if (count.full[shape] !== WANT[shape]) {
          throw new Error(`${shape} built ${count.full[shape]}`)
        }
        counts[shape] = count.full[shape]
        lean += count.lean[shape]

        const words = [...full[shape]].map(p => p.word).sort(compareWords)
        write(
          resolve(dir, `${shape.toLowerCase()}.csv`),
          ['word', ...words].join('\n') + '\n',
        )
      }

      write(
        resolve(dir, 'plan.csv'),
        [
          'shape,count,how',
          ...SHAPES.map(s => `${s},${WANT[s]},"${says(picked[s])}"`),
        ].join('\n') + '\n',
      )

      index.push(
        [
          nn,
          counts.CVC,
          counts.CVCC,
          counts.CCVC,
          TARGET,
          lean,
          moved,
          `"${says(picked.CVC)}"`,
          `"${says(picked.CVCC)}"`,
          `"${says(picked.CCVC)}"`,
        ].join(','),
      )

      console.log(
        `| ${nn} | ${moved} | **CVC** ${says(picked.CVC)} · ` +
          `**CVCC** ${says(picked.CVCC)} · **CCVC** ${says(picked.CCVC)} |`,
      )
    }
  }
}

write(resolve(OUT_DIR, 'index.csv'), index.join('\n') + '\n')

console.log('')
console.log(`wrote ${OUT_DIR}`)
