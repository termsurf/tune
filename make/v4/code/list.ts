/**
 * The sixteen numbers, pulled out of the lexicon.
 *
 * v4 holds 4,096 base words, and 4,096 is 16 x 16 x 16. So three
 * numbers name any word in the language exactly, with nothing spare and
 * nothing short, and sixteen is the count worth having rather than ten.
 *
 * This reads them back out of `term/base.csv` instead of keeping a
 * second list beside it, so a number that gets renamed is renamed here
 * too and cannot drift.
 *
 * A row with no word is a number the lexicon does not have yet. It is
 * written out blank rather than skipped, because a gap in a counting
 * system is the thing you most need to see.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:list
 */

import { parse } from 'csv-parse/sync'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')

/** In order, because the order is the whole point of a number. */
const NUMBERS = [
  'zero', 'one', 'two', 'three',
  'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten', 'eleven',
  'twelve', 'thirteen', 'fourteen', 'fifteen',
]

type Row = { word: string; meaning: string }

const rows: Array<Row> = parse(
  readFileSync(resolve(TERM, 'base.csv'), 'utf-8'),
  { columns: true, skip_empty_lines: true },
)

/** The word a number is said with, if the lexicon has one. */
const said = new Map<string, string>()
for (const row of rows) {
  const meaning = (row.meaning ?? '').trim()
  if (NUMBERS.includes(meaning) && !said.has(meaning)) {
    said.set(meaning, row.word)
  }
}

const out = NUMBERS.map((name, value) => ({
  value,
  word: said.get(name) ?? '',
  name,
}))

const missing = out.filter(row => !row.word)

mkdirSync(TERM, { recursive: true })
writeFileSync(
  resolve(TERM, 'list.csv'),
  [
    'value,word,name',
    ...out.map(r => [r.value, r.word, r.name].join(',')),
  ].join('\n') + '\n',
)

console.log('| value | word | name |')
console.log('| ---: | :--- | :--- |')
for (const row of out) {
  console.log(`| ${row.value} | ${row.word || '—'} | ${row.name} |`)
}

console.log('')
if (missing.length > 0) {
  console.log(
    `${missing.length} of the 16 have no word yet: ` +
      missing.map(r => r.name).join(', '),
  )
} else {
  console.log('all sixteen have a word')
}

console.log('')
console.log(`wrote ${resolve(TERM, 'list.csv')}`)
