/**
 * Checks the Moon lexicon against Moon's own shapes.
 *
 * Moon is not generated. It is the lexicon people built by hand, six
 * thousand terms in `tune.csv` at the root of the package. So the job
 * here is not to make words, it is to find out how far the lexicon and
 * the stated shapes actually agree.
 *
 * Reads `tune.csv`, works out the shape of every term, and writes
 * `base/lexicon.csv` with two columns, tune and english, sorted
 * shortest first. Terms whose shape is not one of Moon's eight are
 * written to `base/off-shape.csv` instead of being thrown away, so
 * nothing is lost and the gap stays visible.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/talk/code/check.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  CONSONANTS,
  ROLES,
  SHAPES,
  SOUNDS,
  VOWELS,
  countSyllables,
  isMoonShape,
  toShape,
} from '#/make/talk/code/sound'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = resolve(__dirname, '../../..')
const BASE_DIR = resolve(__dirname, '../base')

/** The categories tune.csv actually uses. Anything else is spilled text. */
const CATEGORIES = new Set([
  'animal', 'body', 'sound', 'number', 'math', 'code',
  'plant', 'science', 'color', 'measurement',
])

type Term = {
  term: string
  meaning: string
}

/**
 * tune.csv is plain comma separated with no quoting, so a meaning that
 * holds a comma spills into the next field and pushes the row round by
 * one. When the category slot holds something that is not a category,
 * that is the spill, and the row is put back together.
 */
function readTerms(path: string): { terms: Array<Term>; repaired: number } {
  const lines = readFileSync(path, 'utf-8')
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.length > 0)

  const terms: Array<Term> = []
  let repaired = 0

  for (const line of lines.slice(1)) {
    const cell = line.split(',')
    let [category, term, meaning] = cell

    if (category && !CATEGORIES.has(category.trim())) {
      meaning = `${meaning},${category}`
      repaired++
    }

    const word = (term ?? '').trim()
    const gloss = (meaning ?? '').trim()
    if (word.length === 0 || gloss.length === 0) {
      continue
    }

    terms.push({ term: word, meaning: gloss })
  }

  return { terms, repaired }
}

function line(text: string) {
  console.log(text)
}

function rule(title: string) {
  line(`\n${'='.repeat(60)}`)
  line(title)
  line('='.repeat(60))
}

// ─── Run ────────────────────────────────────────────────

const { terms, repaired } = readTerms(resolve(PACKAGE_DIR, 'tune.csv'))

rule('SOUNDS')
line(`vowels:      ${VOWELS.join(' ')}`)
line(`consonants:  ${CONSONANTS.join(' ')}`)
line(`total:       ${SOUNDS.length} sounds`)
line(`shapes:      ${SHAPES.join(' ')}`)
line(`roles:       ${ROLES.map(r => `-${r.vowel} ${r.name}`).join(', ')}`)

rule('LEXICON')
line(`\n  ${terms.length.toLocaleString()} terms in tune.csv`)
line(`  ${repaired} rows put back together after a comma spill`)

const shapeCount: Record<string, number> = {}
const syllableCount: Record<number, number> = {}
const onShape: Array<Term> = []
const offShape: Array<{ term: Term; shape: string }> = []
const badSound: Array<Term> = []
const seen = new Map<string, Array<string>>()

for (const item of terms) {
  const shape = toShape(item.term)
  if (!shape) {
    badSound.push(item)
    continue
  }

  shapeCount[shape] = (shapeCount[shape] ?? 0) + 1
  const syllables = countSyllables(shape)
  syllableCount[syllables] = (syllableCount[syllables] ?? 0) + 1

  const holders = seen.get(item.term) ?? []
  holders.push(item.meaning)
  seen.set(item.term, holders)

  if (isMoonShape(item.term)) {
    onShape.push(item)
  } else {
    offShape.push({ term: item, shape })
  }
}

line(`  ${seen.size.toLocaleString()} distinct terms`)
line(`  ${[...seen.values()].filter(v => v.length > 1).length} terms carry more than one meaning`)
line(`  ${badSound.length} use a sound that is not Moon`)
if (badSound.length > 0) {
  line(`    ${badSound.slice(0, 10).map(t => t.term).join(' ')}`)
}

rule('AGAINST MOON SHAPES')
line('')
line('| shape     | declared | terms |')
line('| :-------- | :------- | ----: |')
for (const [shape, n] of Object.entries(shapeCount).sort((a, b) => b[1] - a[1])) {
  const declared = SHAPES.includes(shape) ? 'yes' : 'no'
  line(`| ${shape.padEnd(9)} | ${declared.padEnd(8)} | ${String(n).padStart(5)} |`)
}

line('')
line(`  ${onShape.length.toLocaleString()} terms are one of the eight shapes`)
line(`  ${offShape.length.toLocaleString()} are not`)
line(`  ${((onShape.length / (onShape.length + offShape.length)) * 100).toFixed(1)}% of the lexicon fits`)

const offByShape: Record<string, Array<string>> = {}
for (const item of offShape) {
  offByShape[item.shape] = [...(offByShape[item.shape] ?? []), item.term.term]
}
line('\n  what falls outside, and by how much:')
for (const [shape, words] of Object.entries(offByShape).sort(
  (a, b) => b[1].length - a[1].length,
)) {
  line(`    ${shape.padEnd(10)} ${String(words.length).padStart(4)}  ${words.slice(0, 6).join(' ')}`)
}

rule('SYLLABLES')
line('')
line('| syllables | terms |')
line('| :-------- | ----: |')
for (const n of Object.keys(syllableCount).map(Number).sort((a, b) => a - b)) {
  line(`| ${String(n).padEnd(9)} | ${String(syllableCount[n]).padStart(5)} |`)
}

// ─── Out ────────────────────────────────────────────────

mkdirSync(BASE_DIR, { recursive: true })

function writeRows(path: string, rows: Array<Term>) {
  const sorted = [...rows].sort(
    (a, b) => a.term.length - b.term.length || a.term.localeCompare(b.term),
  )
  const out = ['tune,english']
  for (const item of sorted) {
    const gloss = item.meaning.includes(',') ? `"${item.meaning}"` : item.meaning
    out.push(`${item.term},${gloss}`)
  }
  writeFileSync(path, out.join('\n') + '\n')
}

writeRows(resolve(BASE_DIR, 'lexicon.csv'), onShape)
writeRows(
  resolve(BASE_DIR, 'off-shape.csv'),
  offShape.map(o => o.term),
)

rule('OUT')
line(`\n  ${onShape.length.toLocaleString()} rows -> base/lexicon.csv`)
line(`  ${offShape.length.toLocaleString()} rows -> base/off-shape.csv`)
line('')
line('  Nothing is dropped. The off shape file is there so the gap')
line('  between what Moon says it allows and what the lexicon actually')
line('  holds stays in front of you.')
