/**
 * The 4:7:5 system, built so no hand written meaning is thrown away.
 *
 *   CVC   1024      CVCC  1792      CCVC  1280      4096 = 2^12
 *
 * `ratio.ts` reaches these numbers with rations and a sieve, both of
 * which cut by arithmetic and have no idea which words already mean
 * something. That cost 478 words that `tune.csv` had already given a
 * meaning to, while keeping three thousand that had none. A bad trade,
 * and an avoidable one: the count is fixed either way, so only WHICH
 * words fill it was ever in question.
 *
 * So this fixes the counts by construction and chooses the members:
 *
 *   1. every legal v4 word carrying a meaning goes in, all 1,219 of
 *      them, and they fit with room to spare
 *   2. the rest is filled by the frequency picker, which corrects for
 *      whatever sounds the kept words happen to be heavy in
 *
 * Nothing here is random, and the arithmetic is not searched for. It
 * owns `4096/02-4-7-5`, which is why `ratio.ts` does not write that
 * folder.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:keep
 */

import { parse } from 'csv-parse/sync'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { SHAPES, compareWords, type Shape } from './sound'
import { run, type Piece } from './plan'
import { HOUSE } from './house'
import { WEIGHT, pickWeighted } from './pick'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v4')
const OUT_DIR = resolve(BASE, '4096/02-4-7-5')

const WANT: Record<Shape, number> = { CVC: 1024, CVCC: 1792, CCVC: 1280 }
const TARGET = 4096

// ─── What Already Means Something ───────────────────────

type Told = { term: string; meaning: string }

const told: Array<Told> = parse(
  readFileSync(resolve(here, '../../../tune.csv'), 'utf-8'),
  { columns: true, skip_empty_lines: true, relax_column_count: true },
)

const meaning = new Map<string, string>()
for (const row of told) {
  const term = (row.term ?? '').trim()
  const says = (row.meaning ?? '').trim()
  if (term && says && !meaning.has(term)) {
    meaning.set(term, says)
  }
}

/**
 * Words a system has claimed, from the scratchpad.
 *
 * A system chooses its words by rule, so the rule decides which word it
 * wants and the picker does not get a say. Four of the six directions
 * were legal v4 words that the frequency picker had simply not chosen,
 * which would have left the rule with holes in it.
 *
 * So the scratchpad is read here too, and anything it names is required
 * exactly as a hand written meaning is.
 */
type Claimed = { word: string; meaning: string; system?: string }

/**
 * Every csv in the scratchpad folder, so a new set is a new file and
 * nothing here has to be edited to pick it up.
 */
const scratch: Array<Claimed> = []
const scratchDir = resolve(BASE, 'term/scratchpad')

for (const name of readdirSync(scratchDir)) {
  if (!name.endsWith('.csv')) {
    continue
  }
  const rows: Array<Claimed> = parse(
    readFileSync(resolve(scratchDir, name), 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    scratch.push({ ...row, system: row.system ?? name.replace('.csv', '') })
  }
}

const claimed = new Map<string, string>()
for (const row of scratch) {
  const word = (row.word ?? '').trim()
  const says = (row.meaning ?? '').trim()
  if (!word || !says) {
    continue
  }
  claimed.set(word, says)

  const had = meaning.get(word)
  if (had !== undefined && had !== says) {
    console.log(
      `  ${word} is claimed by ${row.system} for "${says}" ` +
        `and already means "${had}"`,
    )
  }
  /** The system wins for the purpose of being IN the set. Which
   * meaning it carries is settled in tune.csv, not here. */
  if (!meaning.has(word)) {
    meaning.set(word, says)
  }
}

// ─── Build, Then Choose ─────────────────────────────────

const { full, count } = run(HOUSE)

console.log(`v4 allows ${count.fullAll.toLocaleString()} words`)
console.log(`picking ${TARGET.toLocaleString()} of them, meanings first`)
console.log('')

const taken: Record<Shape, Array<Piece>> = { CVC: [], CVCC: [], CCVC: [] }
const everyTaken: Array<Piece> = []

console.log('| shape | want | kept for meaning | filled |')
console.log('| :--- | ---: | ---: | ---: |')

for (const shape of SHAPES) {
  const pool = full[shape]
  const must = new Set(
    pool.map(p => p.word).filter(word => meaning.has(word)),
  )

  if (must.size > WANT[shape]) {
    throw new Error(
      `${shape} has ${must.size} words with meanings but room for ${WANT[shape]}`,
    )
  }

  const got = pickWeighted(pool, WANT[shape], must)
  taken[shape] = got.taken
  everyTaken.push(...got.taken)

  console.log(
    `| ${shape} | ${WANT[shape]} | ${must.size} | ${WANT[shape] - must.size} |`,
  )
}

if (everyTaken.length !== TARGET) {
  throw new Error(`built ${everyTaken.length}, wanted ${TARGET}`)
}

// ─── Prove It Kept Them ─────────────────────────────────

const held = new Set(everyTaken.map(p => p.word))
const legal = new Set(
  SHAPES.flatMap(shape => full[shape].map(p => p.word)),
)

const owed = [...meaning.keys()].filter(
  word => legal.has(word) && !held.has(word),
)

if (owed.length > 0) {
  throw new Error(
    `${owed.length} words with meanings were still cut: ${owed.slice(0, 10).join(' ')}`,
  )
}

const kept = [...meaning.keys()].filter(word => held.has(word)).length

console.log('')
console.log(
  `every one of the ${kept.toLocaleString()} legal words with a meaning is in`,
)

// ─── The Sound Profile It Came Out With ─────────────────

const profile = pickWeighted(everyTaken, everyTaken.length)

console.log(`sound drift from the wanted shape: ${profile.drift.toFixed(3)} points`)

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

for (const shape of SHAPES) {
  const words = taken[shape].map(p => p.word).sort(compareWords)
  write(
    resolve(OUT_DIR, `${shape.toLowerCase()}.csv`),
    ['word', ...words].join('\n') + '\n',
  )
}

write(
  resolve(OUT_DIR, 'plan.csv'),
  [
    'shape,count,how',
    ...SHAPES.map(
      s =>
        `${s},${WANT[s]},"every legal word with a meaning, then filled by sound frequency"`,
    ),
  ].join('\n') + '\n',
)

write(
  resolve(OUT_DIR, 'weight.csv'),
  [
    'sound,weight,wanted_share,got_share,words',
    ...profile.profile.map(r =>
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
  resolve(OUT_DIR, 'readme.md'),
  [
    '# 4:7:5 = 16',
    '',
    '```text',
    'CVC   1024',
    'CVCC  1792',
    'CCVC  1280',
    '      4096 = 2^12, so a base word is twelve bits',
    '```',
    '',
    '**Built so that no hand written meaning is lost.** Every legal v4',
    `word that \`tune.csv\` gives a meaning to is in this system, all`,
    `${kept.toLocaleString()} of them. The rest of each shape is filled by`,
    'the frequency picker, which leans toward the sounds a language',
    'actually uses and corrects for whatever the kept words are heavy in.',
    '',
    'The counts are fixed by construction rather than searched for, so',
    'there is no sieve here and no ration. Those exist to land on a',
    'number; taking exactly the number wanted lands on it directly.',
    '',
    '| shape | words | of those, already meant something |',
    '| :--- | ---: | ---: |',
    ...SHAPES.map(s => {
      const had = taken[s].filter(p => meaning.has(p.word)).length
      return `| \`${s}\` | ${WANT[s]} | ${had} |`
    }),
    '',
    `Sound drift from the wanted frequency shape is ${profile.drift.toFixed(3)} points.`,
    '',
    'Rebuild with `pnpm --dir deck/tune v4:keep`.',
  ].join('\n') + '\n',
)

console.log('')
console.log(`wrote ${OUT_DIR}`)
