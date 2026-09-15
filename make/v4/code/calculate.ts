/**
 * Builds every v4 base word and writes it to `base/v4/`.
 *
 * Two passes, and both are kept.
 *
 *   full   every word the rules allow, and nothing thrown away
 *   lean   the same list with near copies removed, so no two words
 *          left standing sound alike all the way through
 *
 * The building is all in `plan.ts`, which takes a whole Tune stated as
 * data. This file states the house plan and writes what comes back.
 * `variant.ts` feeds the same engine other plans, so a variant's counts
 * and these counts are answered by one piece of code rather than two.
 *
 * `3.ts` and `4.ts` in v3 both shuffled the candidates before the lean
 * pass, which spread the survivors across the inventory but meant two
 * runs never agreed. There is no randomness here at all: the words are
 * dealt out one opening at a time, which spreads them the same way and
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/calculate.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import {
  CODA_CLUSTERS,
  ONSET_CLUSTERS,
  SHAPES,
  holdsHush,
  type Shape,
} from './sound'

import { run, type Piece } from './plan'
import { HOUSE } from './house'

const here = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(here, '../../../base/v4')

const { full, lean, count } = run(HOUSE)

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

function wordFile(words: Array<Piece>): string {
  return ['word', ...words.map(w => w.word)].join('\n') + '\n'
}

function baseFile(words: Array<Piece>): string {
  const rows = words.map(w =>
    [w.word, w.shape, w.onset, w.vowel, w.coda].join(','),
  )
  return ['word,shape,onset,vowel,coda', ...rows].join('\n') + '\n'
}

const passes: Array<{ name: string; words: Record<Shape, Array<Piece>> }> = [
  { name: 'full', words: full },
  { name: 'lean', words: lean },
]

for (const pass of passes) {
  const all: Array<Piece> = []
  for (const shape of SHAPES) {
    const words = pass.words[shape]
    all.push(...words)
    write(
      resolve(BASE_DIR, pass.name, `${shape.toLowerCase()}.csv`),
      wordFile(words),
    )
  }
  write(resolve(BASE_DIR, pass.name, 'base.csv'), baseFile(all))
}

// ─── Cluster Tables ─────────────────────────────────────

function clusterFile(clusters: Array<string>, used: Set<string>): string {
  const rows = clusters.map(cluster => {
    const reason = holdsHush(cluster)
      ? 'holds_hush'
      : used.has(cluster)
        ? 'used'
        : 'no_word'
    return [cluster, used.has(cluster) ? 'yes' : 'no', reason].join(',')
  })
  return ['cluster,used,reason', ...rows].join('\n') + '\n'
}

const onsetsUsed = new Set(full.CCVC.map(w => w.onset))
const codasUsed = new Set(full.CVCC.map(w => w.coda))

write(resolve(BASE_DIR, 'onset.csv'), clusterFile(ONSET_CLUSTERS, onsetsUsed))
write(resolve(BASE_DIR, 'coda.csv'), clusterFile(CODA_CLUSTERS, codasUsed))

// ─── Counts ─────────────────────────────────────────────

const countRows = SHAPES.map(shape =>
  [shape, count.full[shape], count.lean[shape]].join(','),
)

write(
  resolve(BASE_DIR, 'count.csv'),
  [
    'shape,full,lean',
    ...countRows,
    ['all', count.fullAll, count.leanAll].join(','),
  ].join('\n') + '\n',
)

// ─── Report ─────────────────────────────────────────────

console.log(`onsets: ${ONSET_CLUSTERS.length} listed, ${onsetsUsed.size} used`)
console.log(`codas:  ${CODA_CLUSTERS.length} listed, ${codasUsed.size} used`)
console.log('')
console.log('| shape | full | lean |')
console.log('| :--- | ---: | ---: |')
for (const shape of SHAPES) {
  console.log(
    `| \`${shape}\` | ${count.full[shape].toLocaleString()} | ` +
      `${count.lean[shape].toLocaleString()} |`,
  )
}
console.log(
  `| **all** | **${count.fullAll.toLocaleString()}** | ` +
    `**${count.leanAll.toLocaleString()}** |`,
)
console.log('')
console.log(`wrote ${BASE_DIR}`)
