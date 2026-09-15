/**
 * The six splits of 4,096 worth having, each in its own folder.
 *
 *   CVC    CVCC   CCVC   ratio
 *   1280   1536   1280   5:6:5 = 16
 *   1024   1792   1280   4:7:5 = 16
 *   1024   2048   1024   1:2:1 = 4
 *   1536   1280   1280   6:5:5 = 16
 *   1536   1792    768   6:7:3 = 16
 *   1536   1536   1024   3:3:2 = 8
 *
 * Every one is 4,096 words, so a base word is twelve bits whichever is
 * chosen. What differs is how the language spends those bits across its
 * three shapes.
 *
 * ── why one sweep answers all six ──────────────────────
 *
 * The three shapes never interact, so the question "what can `CVC`
 * come to" has one answer that every ratio then reads off. This sweeps
 * each shape ONCE, recording the cheapest way to reach every total it
 * can reach, and the six ratios are six lookups in that table rather
 * than six searches.
 *
 * ── what it may turn ───────────────────────────────────
 *
 *   pools     how many openings, closings, onset and coda clusters
 *   bar       a family refused at one slot of one shape
 *   ration    a family keeping only a share of its openings, which is
 *             the half and half version of a bar
 *   echo      no word opens and closes on two similar consonants
 *   sieve     an even thinning by rank sum
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/ratio.ts
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
import { PORTIONS, RULES, type Portion, type Rule } from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '../../../base/v4/4096')

const TARGET = 4096

type Ratio = {
  name: string
  cvc: number
  cvcc: number
  ccvc: number
  says: string
  liked?: boolean
}

const RATIOS: Array<Ratio> = [
  { name: '5-6-5', cvc: 1280, cvcc: 1536, ccvc: 1280, says: '5:6:5 = 16' },
  { name: '4-7-5', cvc: 1024, cvcc: 1792, ccvc: 1280, says: '4:7:5 = 16', liked: true },
  { name: '1-2-1', cvc: 1024, cvcc: 2048, ccvc: 1024, says: '1:2:1 = 4' },
  { name: '6-5-5', cvc: 1536, cvcc: 1280, ccvc: 1280, says: '6:5:5 = 16' },
  { name: '6-7-3', cvc: 1536, cvcc: 1792, ccvc: 768, says: '6:7:3 = 16' },
  { name: '3-3-2', cvc: 1536, cvcc: 1536, ccvc: 1024, says: '3:3:2 = 8' },
]

for (const ratio of RATIOS) {
  const sum = ratio.cvc + ratio.cvcc + ratio.ccvc
  if (sum !== TARGET) {
    throw new Error(`${ratio.name} sums to ${sum}, not ${TARGET}`)
  }
}

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
  portion: Portion | null
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
    ration: way.portion ? [way.portion.ration] : [],
    echo: way.echo,
    sieve: way.sieve ? { ...way.sieve, rank: SOUND_RANK_MAP } : null,
    shapes: [shape],
  })
}

function says(way: Way): string {
  const parts: Array<string> = []
  if (way.openDrop) parts.push(`${way.openDrop} openings go`)
  if (way.closeDrop) parts.push(`${way.closeDrop} closings go`)
  if (way.onsetDrop) parts.push(`${way.onsetDrop} onset clusters go`)
  if (way.liquidDrop) parts.push(`${way.liquidDrop} liquid closings go`)
  if (way.otherDrop) parts.push(`${way.otherDrop} other closings go`)
  if (way.rule) parts.push(way.rule.says)
  if (way.portion) parts.push(way.portion.says)
  if (way.echo !== 'none') parts.push(`no word opens and closes alike (${way.echo})`)
  if (way.sieve) parts.push(`an even sieve keeping ${way.sieve.keep.length} of ${way.sieve.mod}`)
  return parts.join('; ') || 'nothing turned'
}

// ─── Sweep Each Shape Once ──────────────────────────────

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

  /**
   * **No bars.** A bar says "never", and never is the wrong thing to
   * say about a sound the language has. Everything here is a ration:
   * a family keeps a quarter, a half or three quarters of a slot.
   */
  const rules: Array<Rule | null> = [null]
  const portions: Array<Portion | null> = [
    null,
    ...PORTIONS.filter(p => p.ration.shape === shape),
  ]

  for (let openDrop = 0; openDrop <= openMax; openDrop++)
  for (let closeDrop = 0; closeDrop <= closeMax; closeDrop++)
  for (let onsetDrop = 0; onsetDrop <= onsetMax; onsetDrop++)
  for (let liquidDrop = 0; liquidDrop <= liquidMax; liquidDrop++)
  for (let otherDrop = 0; otherDrop <= otherMax; otherDrop++)
  for (const rule of rules)
  for (const portion of portions)
  for (const echo of ECHOES)
  for (const sieve of SIEVES) {
    const way: Way = {
      openDrop, closeDrop, onsetDrop, liquidDrop, otherDrop,
      rule, portion, echo, sieve,
      moved:
        openDrop + closeDrop + onsetDrop + liquidDrop + otherDrop +
        (rule ? 1 : 0) + (portion ? 1 : 0) +
        (echo === 'none' ? 0 : 1) + (sieve ? 1 : 0),
    }
    const got = tally(planOf(shape, way), shape)
    const had = reach[shape].get(got)
    if (!had || way.moved < had.moved) {
      reach[shape].set(got, way)
    }
  }

  console.log(`${shape} can reach ${reach[shape].size.toLocaleString()} totals`)
}

console.log('')
console.log(`swept in ${((Date.now() - started) / 1000).toFixed(1)}s`)
console.log('')

// ─── Write Each Ratio ───────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const index: Array<string> = ['folder,ratio,cvc,cvcc,ccvc,all,lean,reachable']

console.log('| folder | ratio | CVC | CVCC | CCVC | lean | reachable |')
console.log('| :--- | :--- | ---: | ---: | ---: | ---: | :--- |')

for (let i = 0; i < RATIOS.length; i++) {
  const ratio = RATIOS[i]
  const nn = String(i + 1).padStart(2, '0')
  const folder = `${nn}-${ratio.name}`

  const want: Record<Shape, number> = {
    CVC: ratio.cvc,
    CVCC: ratio.cvcc,
    CCVC: ratio.ccvc,
  }

  const ways: Partial<Record<Shape, Way>> = {}
  let ok = true
  for (const shape of SHAPES) {
    const way = reach[shape].get(want[shape])
    if (!way) {
      ok = false
      break
    }
    ways[shape] = way
  }

  if (!ok) {
    console.log(
      `| ${folder} | ${ratio.says} | ${ratio.cvc} | ${ratio.cvcc} | ` +
        `${ratio.ccvc} | | **not reachable** |`,
    )
    index.push(
      [folder, ratio.says, ratio.cvc, ratio.cvcc, ratio.ccvc, TARGET, '', 'no'].join(','),
    )
    continue
  }

  const dir = resolve(OUT_DIR, folder)
  let lean = 0

  for (const shape of SHAPES) {
    const { full, count } = run(planOf(shape, ways[shape] as Way))
    if (count.full[shape] !== want[shape]) {
      throw new Error(`${folder}/${shape} built ${count.full[shape]}`)
    }
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
      ...SHAPES.map(s => `${s},${want[s]},"${says(ways[s] as Way)}"`),
    ].join('\n') + '\n',
  )

  write(
    resolve(dir, 'readme.md'),
    [
      `# ${ratio.says}`,
      '',
      ratio.liked
        ? '**The one leaned toward.** '
        : '',
      `\`\`\`text`,
      `CVC   ${ratio.cvc}`,
      `CVCC  ${ratio.cvcc}`,
      `CCVC  ${ratio.ccvc}`,
      `      ${TARGET} = 2^12, so a base word is twelve bits`,
      `\`\`\``,
      '',
      'How each shape reaches its number:',
      '',
      ...SHAPES.map(s => `- **${s}** at ${want[s]}: ${says(ways[s] as Way)}`),
      '',
      `After the closeness pass, ${lean} words stay distinct.`,
      '',
      'Rebuild with `pnpm --dir deck/tune exec tsx make/v4/code/ratio.ts`.',
    ].join('\n') + '\n',
  )

  index.push(
    [folder, ratio.says, ratio.cvc, ratio.cvcc, ratio.ccvc, TARGET, lean, 'yes'].join(','),
  )

  console.log(
    `| ${folder} | ${ratio.says} | ${ratio.cvc} | ${ratio.cvcc} | ` +
      `${ratio.ccvc} | ${lean} | yes${ratio.liked ? ' **(leaned toward)**' : ''} |`,
  )
}

write(resolve(OUT_DIR, 'ratio.csv'), index.join('\n') + '\n')

console.log('')
console.log(`wrote ${OUT_DIR}`)
