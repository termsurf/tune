/**
 * 4,096 chosen so the sounds turn up as often as they should.
 *
 * The other patterns decide WHICH sounds and clusters the language has.
 * This one keeps the whole inventory and decides how OFTEN each sound
 * is heard, because that is the thing natural languages actually differ
 * in. No language uses its sounds evenly.
 *
 * The wanted shape and the picker both live in `pick.ts`, so this file
 * only says where to point them and what to write.
 *
 * ── how it lands on the number exactly ─────────────────
 *
 * By construction. The whole language is built, and exactly 4,096 of
 * its words are taken, so the total is never searched for. What the
 * picker decides is which 4,096, and it decides by deficit: a word is
 * worth the sum of how far below their share its sounds currently sit.
 *
 * **Nothing here is random.** Ties are settled by the tone order, so
 * the list rebuilds identically every time.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/weight.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { SHAPES, compareWords, type Shape } from './sound'
import { run, type Piece } from './plan'
import { HOUSE } from './house'
import { WEIGHT, pickWeighted } from './pick'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '../../../base/v4/4096/04-sound-weight')

const TARGET = 4096

const { full, count } = run(HOUSE)

const every: Array<Piece> = []
for (const shape of SHAPES) {
  every.push(...full[shape])
}

console.log(`the whole language is ${count.fullAll.toLocaleString()} words`)
console.log(`picking ${TARGET.toLocaleString()} of them`)
console.log('')

const picked = pickWeighted(every, TARGET)

console.log('| sound | wanted | got | words |')
console.log('| :--- | ---: | ---: | ---: |')
for (const row of picked.profile) {
  console.log(
    `| ${row.sound} | ${row.want.toFixed(2)}% | ${row.got.toFixed(2)}% | ` +
      `${row.count} |`,
  )
}

console.log('')
console.log(
  `average drift from the wanted share: ${picked.drift.toFixed(3)} points`,
)

const byShape = {} as Record<Shape, Array<Piece>>
for (const shape of SHAPES) {
  byShape[shape] = picked.taken.filter(p => p.shape === shape)
}

console.log('')
console.log(
  `CVC ${byShape.CVC.length}, CVCC ${byShape.CVCC.length}, ` +
    `CCVC ${byShape.CCVC.length}, all ${picked.taken.length}`,
)

/** The two claims this pattern makes, checked rather than asserted. */
const dry = picked.profile.filter(p => p.count === 0)
if (dry.length > 0) {
  throw new Error(`these sounds reached no word: ${dry.map(p => p.sound).join(' ')}`)
}

const tx = picked.used.get('tx') ?? 0
const dj = picked.used.get('dj') ?? 0
console.log(`tx ${tx} and dj ${dj}, apart by ${Math.abs(tx - dj)}`)

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const dir = resolve(OUT_DIR, '01')

for (const shape of SHAPES) {
  const words = byShape[shape].map(p => p.word).sort(compareWords)
  write(
    resolve(dir, `${shape.toLowerCase()}.csv`),
    ['word', ...words].join('\n') + '\n',
  )
}

write(
  resolve(dir, 'weight.csv'),
  [
    'sound,weight,wanted_share,got_share,words',
    ...picked.profile.map(r =>
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
  resolve(OUT_DIR, 'index.csv'),
  [
    'variant,cvc,cvcc,ccvc,all,drift',
    [
      '01',
      byShape.CVC.length,
      byShape.CVCC.length,
      byShape.CCVC.length,
      picked.taken.length,
      picked.drift.toFixed(3),
    ].join(','),
  ].join('\n') + '\n',
)

console.log('')
console.log(`wrote ${OUT_DIR}`)
