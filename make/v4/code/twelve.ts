/**
 * Writes every way to make a v4 of exactly 4,096 words.
 *
 * 4,096 is 2^12, so a base word is exactly twelve bits.
 *
 * The count never cares WHICH sound leaves a pool, only how many, so
 * the search is over five small numbers and each hit is then realised
 * into named sounds and built. Each variant is written under its own
 * number, nearest to the house plan first.
 *
 *   base/v4/4096/index.csv          what each variant drops
 *   base/v4/4096/<nn>/cvc.csv
 *   base/v4/4096/<nn>/cvcc.csv
 *   base/v4/4096/<nn>/ccvc.csv
 *   base/v4/4096/<nn>/plan.csv      the pools it was built from
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/twelve.ts
 *   pnpm --dir deck/tune exec tsx make/v4/code/twelve.ts --count 20
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { SHAPES, compareWords } from './sound'
import { countFull, run, withPlan, type Plan } from './plan'
import {
  HOUSE,
  MARKED_ONSETS,
  MARKED_SOUNDS,
  opensOnLiquid,
} from './house'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '../../../base/v4/4096/01-drop-clusters')

const TARGET = 4096

const args = process.argv.slice(2)
const countAt = args.indexOf('--count')
const WANT = countAt >= 0 ? Number(args[countAt + 1]) : 12

// ─── Realising A Size Into Sounds ───────────────────────

type Way = {
  openDrop: number
  closeDrop: number
  onsetDrop: number
  liquidDrop: number
  otherDrop: number
}

function moved(way: Way): number {
  return (
    way.openDrop +
    way.closeDrop +
    way.onsetDrop +
    way.liquidDrop +
    way.otherDrop
  )
}

/**
 * Which sound goes is a language decision, not an arithmetic one, so
 * the order here is stated rather than clever. The hushes and the
 * interdentals leave first because they are the marked sounds, then
 * the rest from the end of the list. Any other pick of the same size
 * gives the same count.
 */
function shrink(way: Way): Plan {
  function order(list: Array<string>, first: Array<string>): Array<string> {
    return [
      ...list.filter(c => first.includes(c)),
      ...[...list].reverse().filter(c => !first.includes(c)),
    ]
  }

  const openGone = new Set(
    order(HOUSE.open, MARKED_SOUNDS).slice(0, way.openDrop),
  )
  const closeGone = new Set(
    order(HOUSE.close, MARKED_SOUNDS).slice(0, way.closeDrop),
  )
  const onsetGone = new Set(
    order(HOUSE.onset, MARKED_ONSETS).slice(0, way.onsetDrop),
  )

  const liquidCodas = HOUSE.coda.filter(opensOnLiquid)
  const otherCodas = HOUSE.coda.filter(c => !opensOnLiquid(c))
  const codaGone = new Set([
    ...[...liquidCodas].reverse().slice(0, way.liquidDrop),
    ...[...otherCodas].reverse().slice(0, way.otherDrop),
  ])

  return withPlan(HOUSE, {
    name: `4096`,
    note: `${moved(way)} dropped`,
    open: HOUSE.open.filter(c => !openGone.has(c)),
    close: HOUSE.close.filter(c => !closeGone.has(c)),
    onset: HOUSE.onset.filter(c => !onsetGone.has(c)),
    coda: HOUSE.coda.filter(c => !codaGone.has(c)),
  })
}

// ─── Search ─────────────────────────────────────────────

const liquidCount = HOUSE.coda.filter(opensOnLiquid).length
const otherCount = HOUSE.coda.length - liquidCount

const found: Array<Way> = []

for (let openDrop = 0; openDrop <= 8; openDrop++) {
  for (let closeDrop = 0; closeDrop <= 8; closeDrop++) {
    for (let onsetDrop = 0; onsetDrop <= HOUSE.onset.length; onsetDrop++) {
      for (let liquidDrop = 0; liquidDrop <= liquidCount; liquidDrop++) {
        for (let otherDrop = 0; otherDrop <= otherCount; otherDrop++) {
          const way = {
            openDrop,
            closeDrop,
            onsetDrop,
            liquidDrop,
            otherDrop,
          }
          if (countFull(shrink(way)) === TARGET) {
            found.push(way)
          }
        }
      }
    }
  }
}

found.sort((a, b) => moved(a) - moved(b))

console.log(`${found.length} ways to reach exactly ${TARGET}`)
console.log(`writing the ${Math.min(WANT, found.length)} nearest`)
console.log('')

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

function gone(before: Array<string>, after: Array<string>): string {
  const kept = new Set(after)
  return before.filter(c => !kept.has(c)).join(' ')
}

const index: Array<string> = [
  'variant,cvc,cvcc,ccvc,all,lean,open,close,onset,coda,coda_liquid,' +
    'dropped_openings,dropped_closings,dropped_onset_clusters,dropped_coda_clusters',
]

console.log('| n | CVC | CVCC | CCVC | all | lean | what it drops |')
console.log('| ---: | ---: | ---: | ---: | ---: | ---: | :--- |')

const chosen = found.slice(0, WANT)

for (let i = 0; i < chosen.length; i++) {
  const way = chosen[i]
  const plan = shrink(way)
  const { full, count } = run(plan)

  if (count.fullAll !== TARGET) {
    throw new Error(`variant ${i + 1} built ${count.fullAll}, wanted ${TARGET}`)
  }

  const nn = String(i + 1).padStart(2, '0')
  const dir = resolve(OUT_DIR, nn)

  for (const shape of SHAPES) {
    const words = [...full[shape]].map(p => p.word).sort(compareWords)
    write(
      resolve(dir, `${shape.toLowerCase()}.csv`),
      ['word', ...words].join('\n') + '\n',
    )
  }

  const liquid = plan.coda.filter(opensOnLiquid).length

  write(
    resolve(dir, 'plan.csv'),
    [
      'pool,size,sounds',
      `open,${plan.open.length},${plan.open.join(' ')}`,
      `close,${plan.close.length},${plan.close.join(' ')}`,
      `onset,${plan.onset.length},${plan.onset.join(' ')}`,
      `coda,${plan.coda.length},${plan.coda.join(' ')}`,
    ].join('\n') + '\n',
  )

  const dropOpen = gone(HOUSE.open, plan.open)
  const dropClose = gone(HOUSE.close, plan.close)
  const dropOnset = gone(HOUSE.onset, plan.onset)
  const dropCoda = gone(HOUSE.coda, plan.coda)

  index.push(
    [
      nn,
      count.full.CVC,
      count.full.CVCC,
      count.full.CCVC,
      count.fullAll,
      count.leanAll,
      plan.open.length,
      plan.close.length,
      plan.onset.length,
      plan.coda.length,
      liquid,
      dropOpen,
      dropClose,
      dropOnset,
      dropCoda,
    ].join(','),
  )

  const says = [
    dropOpen && `openings ${dropOpen}`,
    dropClose && `closings ${dropClose}`,
    dropOnset && `onsets ${dropOnset}`,
    dropCoda && `codas ${dropCoda}`,
  ]
    .filter(Boolean)
    .join('; ')

  console.log(
    `| ${nn} | ${count.full.CVC} | ${count.full.CVCC} | ` +
      `${count.full.CCVC} | ${count.fullAll} | ${count.leanAll} | ${says} |`,
  )
}

write(resolve(OUT_DIR, 'index.csv'), index.join('\n') + '\n')

console.log('')
console.log(`wrote ${OUT_DIR}`)
