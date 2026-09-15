/**
 * The chosen lexicon, in one file and in reading order.
 *
 * `base/v4/4096/02-4-7-5` holds the words as three lists, one per
 * shape, because that is how they are built and counted. This puts them
 * back together as the single list somebody would actually read down
 * when handing out meanings.
 *
 * ── the order ──────────────────────────────────────────
 *
 * Shapes come in the order a word grows: `CVC` first, then `CCVC`
 * which adds a sound at the front, then `CVCC` which adds one at the
 * back. Inside each shape the words run in tune alphabetical order,
 * which is `SORT_ORDER` in `code/phonology.ts` and not the Latin one.
 *
 *   i e a o u  m n q g d b p t k h  s z v f x j C c  y r l w
 *
 * So `mim` sorts before `mib`, because `m` comes before `b` in tune
 * even though it does not in English.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:term
 *   pnpm --dir deck/tune v4:term --from 01-5-6-5
 */

import { parse } from 'csv-parse/sync'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { compareWords, toShape, type Shape } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v4')

const argv = process.argv.slice(2)
const fromAt = argv.indexOf('--from')
const FROM = fromAt >= 0 ? argv[fromAt + 1] : '02-4-7-5'

/** The order a word grows: bare, then a front cluster, then a back one. */
const ORDER: Array<Shape> = ['CVC', 'CCVC', 'CVCC']

const SOURCE = resolve(BASE, '4096', FROM)
const OUT = resolve(BASE, 'term/base.csv')

function read(shape: Shape): Array<string> {
  const path = resolve(SOURCE, `${shape.toLowerCase()}.csv`)
  return readFileSync(path, 'utf-8')
    .split('\n')
    .slice(1)
    .map(line => line.trim())
    .filter(Boolean)
}

// ─── Meanings Already Given ─────────────────────────────

/**
 * The meanings carried over from `tune.csv`.
 *
 * That file is the hand written lexicon and it holds more than v4 can
 * use: older shapes, and forms v4 now refuses. Only the words that are
 * in this system get their meaning back, and the rest are counted and
 * reported rather than dropped quietly, because a meaning somebody
 * wrote by hand and then lost is the expensive kind of loss.
 *
 * Parsed with `csv-parse` rather than split on commas, because a
 * meaning is free text and several hold commas of their own.
 */
type Told = { term: string; meaning: string }

const told: Array<Told> = parse(
  readFileSync(resolve(here, '../../../tune.csv'), 'utf-8'),
  { columns: true, skip_empty_lines: true, relax_column_count: true },
)

const meaning = new Map<string, string>()
const clashes: Array<string> = []

for (const row of told) {
  const term = (row.term ?? '').trim()
  const says = (row.meaning ?? '').trim()
  if (!term || !says) {
    continue
  }

  const had = meaning.get(term)
  if (had === undefined) {
    meaning.set(term, says)
  } else if (had !== says) {
    /** Two meanings for one word. The first is kept and the second is
     * shown, because picking silently would hide a real decision. */
    clashes.push(`${term}: "${had}" and "${says}"`)
  }
}

const rows: Array<string> = []
const counts: Array<string> = []
const seen = new Set<string>()
const used = new Set<string>()

/** A field only needs quoting when it holds a comma or a quote. */
function cell(text: string): string {
  if (!/[",]/.test(text)) {
    return text
  }
  return `"${text.replace(/"/g, '""')}"`
}

for (const shape of ORDER) {
  const words = read(shape).sort(compareWords)

  for (const word of words) {
    if (toShape(word) !== shape) {
      throw new Error(`${word} is in the ${shape} file and is not ${shape}`)
    }
    if (seen.has(word)) {
      throw new Error(`${word} appears twice`)
    }
    seen.add(word)

    const says = meaning.get(word) ?? ''
    if (says) {
      used.add(word)
    }

    rows.push([word, cell(says)].join(','))
  }

  counts.push(`${shape} ${words.length}`)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, ['word,meaning', ...rows].join('\n') + '\n')

// ─── What Carried Over, And What Did Not ────────────────

/**
 * The meanings that did not carry over, split by whose fault it is.
 *
 *   cut       the word is a perfectly good v4 word and THIS system
 *             threw it away. The sieve and the rations cut by
 *             arithmetic and have no idea which words already mean
 *             something, so these are the ones worth arguing about
 *   unfit     the word breaks a v4 rule, or is a shape v4 does not
 *             have. Nothing to be done short of changing the rules
 */
const legal = new Set(
  readFileSync(resolve(BASE, 'full/base.csv'), 'utf-8')
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map(line => line.split(',')[0]),
)

const stranded = [...meaning.keys()].filter(term => !used.has(term))
const cut = stranded.filter(term => legal.has(term)).sort(compareWords)
const unfit = stranded.filter(term => !legal.has(term)).sort()

console.log(`from ${FROM}`)
console.log(counts.join(', '))
console.log(`${rows.length} words`)
console.log('')
console.log(`tune.csv gives ${meaning.size.toLocaleString()} meanings`)
console.log(`${used.size.toLocaleString()} of them landed on a v4 word`)
console.log(
  `${stranded.length.toLocaleString()} did not, because the word is not in this system`,
)
console.log(
  `${(rows.length - used.size).toLocaleString()} v4 words are still waiting for a meaning`,
)

if (clashes.length > 0) {
  console.log('')
  console.log(`${clashes.length} words carry two meanings, first one kept:`)
  for (const clash of clashes.slice(0, 12)) {
    console.log(`  ${clash}`)
  }
}

function rowsOf(terms: Array<string>): string {
  return (
    [
      'word,meaning',
      ...terms.map(t => [t, cell(meaning.get(t) ?? '')].join(',')),
    ].join('\n') + '\n'
  )
}

const cutPath = resolve(BASE, 'term/cut.csv')
const unfitPath = resolve(BASE, 'term/unfit.csv')

writeFileSync(cutPath, rowsOf(cut))
writeFileSync(unfitPath, rowsOf(unfit))

console.log('')
console.log(
  `of the ${stranded.length.toLocaleString()} that did not carry over:`,
)
console.log(
  `  ${cut.length} are good v4 words this system cut, which is a choice`,
)
console.log(
  `  ${unfit.length.toLocaleString()} do not fit v4 at all, which is not`,
)

console.log('')
console.log(`wrote ${OUT}`)
console.log(`wrote ${cutPath}`)
console.log(`wrote ${unfitPath}`)
