/**
 * 4,096 landed on by a number pattern.
 *
 * The first two patterns get to 4,096 by taste: drop these clusters,
 * bar that family from this slot. This one asks the arithmetic to be
 * pretty as well as correct, so the sizes themselves mean something.
 *
 * Two families, both exact.
 *
 * ── powers of two ──────────────────────────────────────
 *
 * Every shape is its own power of two, and they stack to 2^12.
 *
 *   1024 + 1024 + 2048 = 4096       2^10 + 2^10 + 2^11 = 2^12
 *
 * So a word is twelve bits, and WHICH shape it is costs nothing extra
 * to say: the shape is a prefix of the number.
 *
 * ── fibonacci pools ────────────────────────────────────
 *
 * The four pools are consecutive Fibonacci numbers.
 *
 *   8   onset clusters
 *   13  closings
 *   21  openings
 *   34  coda clusters
 *
 * Two of those are already true. v4 has exactly 21 openings and exactly
 * 34 coda clusters that reach a word, which is where the idea came
 * from rather than something arranged afterwards.
 *
 * Both families are searched on the closed form alone, no sieve and no
 * echo, because a pattern that needs a tiebreaker bolted on is not a
 * pattern. `tally` checks every hit by counting it a second way.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/pattern.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { SHAPES, compareWords } from './sound'
import { coverage, run, withPlan, type Plan } from './plan'
import { HOUSE, LIQUIDS, MARKED_SOUNDS, opensOnLiquid } from './house'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '../../../base/v4/4096/03-number-pattern')

const TARGET = 4096

const POWERS = [64, 128, 256, 512, 1024, 2048]
const FIBONACCI = [8, 13, 21, 34]

// ─── Pools By Size ──────────────────────────────────────

/**
 * Cuts a pool down to a size, marked sounds leaving first.
 *
 * `keepLiquid` says how many of `l` and `r` survive, because a liquid
 * closing is worth 2 vowels where every other is worth 5, so the count
 * turns on it.
 */
function trimSounds(
  pool: Array<string>,
  size: number,
  keepLiquid: number,
): Array<string> | null {
  const liquid = pool.filter(c => LIQUIDS.includes(c))
  const marked = pool.filter(c => MARKED_SOUNDS.includes(c))
  const plain = pool.filter(
    c => !LIQUIDS.includes(c) && !MARKED_SOUNDS.includes(c),
  )

  const keptLiquid = liquid.slice(0, keepLiquid)
  const room = size - keptLiquid.length
  if (room < 0) return null

  /** Plain sounds are the backbone, marked ones fill what is left. */
  const kept = [...plain.slice(0, room)]
  let need = room - kept.length
  if (need > 0) {
    kept.push(...marked.slice(0, need))
    need = room - kept.length
  }
  if (need > 0) return null

  const out = [...kept, ...keptLiquid]
  return out.length === size ? pool.filter(c => out.includes(c)) : null
}

function trimCodas(
  pool: Array<string>,
  size: number,
  keepLiquid: number,
): Array<string> | null {
  const liquid = pool.filter(opensOnLiquid)
  const other = pool.filter(c => !opensOnLiquid(c))
  if (keepLiquid > liquid.length) return null
  const room = size - keepLiquid
  if (room < 0 || room > other.length) return null
  const kept = new Set([
    ...liquid.slice(0, keepLiquid),
    ...other.slice(0, room),
  ])
  return pool.filter(c => kept.has(c))
}

/** What one opening buys, given a closing pool. */
function per(pool: Array<string>, liquidFirst: (c: string) => boolean): number {
  let n = 0
  for (const c of pool) {
    n += liquidFirst(c) ? 2 : 5
  }
  return n
}

// ─── Search ─────────────────────────────────────────────

type Hit = {
  family: string
  marks: number
  why: string
  plan: Plan
  cvc: number
  cvcc: number
  ccvc: number
}

const hits: Array<Hit> = []

const openPool = HOUSE.open
const closePool = HOUSE.close
const onsetPool = HOUSE.onset
const codaPool = HOUSE.coda

const isLiquidClose = (c: string) => LIQUIDS.includes(c)

for (let openSize = 6; openSize <= openPool.length; openSize++) {
  for (let closeSize = 6; closeSize <= closePool.length; closeSize++) {
    for (let closeLiquid = 0; closeLiquid <= 2; closeLiquid++) {
      const close = trimSounds(closePool, closeSize, closeLiquid)
      const open = trimSounds(openPool, openSize, 2)
      if (!close || !open) continue

      const pClose = per(close, isLiquidClose)
      const cvc = open.length * pClose

      for (let onsetSize = 3; onsetSize <= onsetPool.length; onsetSize++) {
        const ccvc = onsetSize * pClose

        for (let codaSize = 8; codaSize <= codaPool.length; codaSize++) {
          for (let codaLiquid = 0; codaLiquid <= 20; codaLiquid++) {
            const coda = trimCodas(codaPool, codaSize, codaLiquid)
            if (!coda) continue

            const cvcc = open.length * per(coda, opensOnLiquid)
            if (cvc + cvcc + ccvc !== TARGET) continue

            const sizes = [onsetSize, close.length, open.length, coda.length]

            /**
             * Every named pattern this configuration satisfies. A hit
             * is kept if it satisfies any, and the prettiest is the one
             * that satisfies the most.
             */
            const marks: Array<string> = []

            if (POWERS.includes(cvc) && POWERS.includes(cvcc) && POWERS.includes(ccvc)) {
              marks.push('every shape a power of two')
            }
            if (cvc === ccvc) {
              marks.push('the two one cluster shapes balance exactly')
            }
            if (cvc % 256 === 0 && cvcc % 256 === 0 && ccvc % 256 === 0) {
              marks.push('every shape a multiple of 256')
            }
            if (cvc % 64 === 0 && cvcc % 64 === 0 && ccvc % 64 === 0) {
              marks.push('every shape a multiple of 64')
            }
            if (open.length === onsetSize) {
              marks.push('as many openings as onset clusters')
            }
            if (sizes.every(s => FIBONACCI.includes(s))) {
              marks.push('all four pools Fibonacci numbers')
            } else if (sizes.filter(s => FIBONACCI.includes(s)).length >= 3) {
              marks.push('three of the four pools Fibonacci numbers')
            }
            if (cvcc === cvc + ccvc) {
              marks.push('the cluster closing shape equals the other two together')
            }

            if (marks.length === 0) continue

            const onset = onsetPool.slice(0, onsetSize)

            hits.push({
              family: marks.length >= 3 ? 'rich' : marks.length === 2 ? 'double' : 'single',
              why: marks.join('; '),
              marks: marks.length,
              plan: withPlan(HOUSE, {
                name: 'number_pattern',
                open,
                close,
                onset,
                coda,
              }),
              cvc,
              cvcc,
              ccvc,
            })
          }
        }
      }
    }
  }
}

console.log(`${hits.length} number patterns land on exactly ${TARGET}`)
console.log('')

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const seen = new Set<string>()
const index: Array<string> = [
  'variant,family,cvc,cvcc,ccvc,all,lean,open,close,onset,coda,why',
]

console.log('| n | family | CVC | CVCC | CCVC | all | lean | why |')
console.log('| ---: | :--- | ---: | ---: | ---: | ---: | ---: | :--- |')

let wrote = 0

hits.sort((a, b) => b.marks - a.marks)

for (const hit of hits) {
  const key = `${hit.family}|${hit.cvc}|${hit.cvcc}|${hit.ccvc}`
  if (seen.has(key)) continue
  seen.add(key)

  const { full, count } = run(hit.plan)
  if (count.fullAll !== TARGET) {
    throw new Error(`built ${count.fullAll}, wanted ${TARGET}`)
  }

  const cover = coverage(hit.plan, full, [])
  if (!cover.pools) continue

  wrote++
  const nn = String(wrote).padStart(2, '0')
  const dir = resolve(OUT_DIR, nn)

  for (const shape of SHAPES) {
    const words = [...full[shape]].map(p => p.word).sort(compareWords)
    write(
      resolve(dir, `${shape.toLowerCase()}.csv`),
      ['word', ...words].join('\n') + '\n',
    )
  }

  write(
    resolve(dir, 'plan.csv'),
    [
      'pool,size,sounds',
      `open,${hit.plan.open.length},${hit.plan.open.join(' ')}`,
      `close,${hit.plan.close.length},${hit.plan.close.join(' ')}`,
      `onset,${hit.plan.onset.length},${hit.plan.onset.join(' ')}`,
      `coda,${hit.plan.coda.length},${hit.plan.coda.join(' ')}`,
    ].join('\n') + '\n',
  )

  index.push(
    [
      nn,
      hit.family,
      hit.cvc,
      hit.cvcc,
      hit.ccvc,
      count.fullAll,
      count.leanAll,
      hit.plan.open.length,
      hit.plan.close.length,
      hit.plan.onset.length,
      hit.plan.coda.length,
      `"${hit.why}"`,
    ].join(','),
  )

  console.log(
    `| ${nn} | ${hit.family} | ${hit.cvc} | ${hit.cvcc} | ${hit.ccvc} | ` +
      `${count.fullAll} | ${count.leanAll} | ${hit.why} |`,
  )
}

if (wrote > 0) {
  write(resolve(OUT_DIR, 'index.csv'), index.join('\n') + '\n')
  console.log('')
  console.log(`wrote ${OUT_DIR}`)
} else {
  console.log('no number pattern lands on the target')
}
