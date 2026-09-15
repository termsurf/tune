/**
 * Moves a settled scratchpad system into `tune.csv`.
 *
 * `base.csv` is generated from `tune.csv`, so a value written straight
 * into it is gone on the next `v4:term`. The lexicon is the source and
 * this is what writes to it.
 *
 * **Reports by default and writes only on `--commit`**, because
 * `tune.csv` is hand written and thousands of rows deep.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:adopt --from system
 *   pnpm --dir deck/tune v4:adopt --from system --commit
 */

import { parse } from 'csv-parse/sync'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { testWord } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const TUNE = resolve(here, '../../../tune.csv')
const SCRATCH = resolve(here, '../../../base/v4/term/scratchpad')

const argv = process.argv.slice(2)
const fromAt = argv.indexOf('--from')
const FROM = fromAt >= 0 ? argv[fromAt + 1] : 'system'
const COMMIT = argv.includes('--commit')

type Claim = { word: string; meaning: string; system?: string }

const claims: Array<Claim> = parse(
  readFileSync(resolve(SCRATCH, `${FROM}.csv`), 'utf-8'),
  { columns: true, skip_empty_lines: true, relax_column_count: true },
)

const wanted = claims
  .map(c => ({
    word: (c.word ?? '').trim(),
    meaning: (c.meaning ?? '').trim(),
    system: c.system ?? FROM,
  }))
  .filter(c => c.word && c.meaning)

// ─── Read the lexicon as lines, to preserve everything ──

const lines = readFileSync(TUNE, 'utf-8').split('\n')
const head = lines[0]
const body = lines.slice(1)

/** Which row currently holds each word, and what it says. */
const rowOf = new Map<string, number>()
const saysOf = new Map<string, string>()

for (let i = 0; i < body.length; i++) {
  const cells = body[i].split(',')
  const term = (cells[1] ?? '').trim()
  if (!term || rowOf.has(term)) continue
  rowOf.set(term, i)
  saysOf.set(term, (cells[2] ?? '').trim())
}

// ─── Work out the changes ───────────────────────────────

type Change = {
  word: string
  meaning: string
  system: string
  was: string
  kind: 'new' | 'fill' | 'replace'
}

const changes: Array<Change> = []
const illegal: Array<Change> = []

for (const c of wanted) {
  const test = testWord(c.word)
  const was = saysOf.get(c.word) ?? ''
  const kind: Change['kind'] = !rowOf.has(c.word)
    ? 'new'
    : was
      ? 'replace'
      : 'fill'
  const change: Change = { ...c, was, kind }

  if (!test.ok) {
    illegal.push(change)
    continue
  }
  changes.push(change)
}

console.log(`${FROM}.csv claims ${wanted.length} words`)
console.log('')

for (const kind of ['new', 'fill', 'replace'] as const) {
  const some = changes.filter(c => c.kind === kind)
  if (some.length === 0) continue
  console.log(
    kind === 'replace'
      ? `${some.length} REPLACE a meaning that is already there:`
      : kind === 'fill'
        ? `${some.length} fill a word that has no meaning yet:`
        : `${some.length} add a word the lexicon does not have:`,
  )
  for (const c of some) {
    console.log(
      `  ${c.word.padEnd(5)} ${c.meaning.padEnd(10)}` +
        (c.was ? ` was "${c.was}"` : ''),
    )
  }
  console.log('')
}

if (illegal.length > 0) {
  console.log(`${illegal.length} are NOT legal v4 words and are skipped:`)
  for (const c of illegal) {
    console.log(`  ${c.word} ${c.meaning}`)
  }
  console.log('')
}

// ─── Write ──────────────────────────────────────────────

if (!COMMIT) {
  console.log('nothing written. run again with --commit')
  process.exit(0)
}

const out = [...body]

for (const c of changes) {
  const at = rowOf.get(c.word)
  if (at === undefined) {
    out.push(`,${c.word},${c.meaning},,,`)
    continue
  }
  const cells = out[at].split(',')
  while (cells.length < 6) cells.push('')
  cells[2] = c.meaning
  out[at] = cells.join(',')
}

writeFileSync(TUNE, [head, ...out].join('\n'))

console.log(`wrote ${changes.length} into ${TUNE}`)
console.log('run `pnpm --dir deck/tune v4:keep` then `v4:term` to rebuild')
