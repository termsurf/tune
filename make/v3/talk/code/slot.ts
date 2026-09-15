import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const VOWEL_ORDER = 'ieaou'
const CONSONANT_ORDER = 'mnqgdbptkhsfvzjxcCwlry'
const VOWELS = new Set(VOWEL_ORDER.split(''))

const CHAR_RANK: Record<string, number> = {}
for (let i = 0; i < VOWEL_ORDER.length; i++) {
  CHAR_RANK[VOWEL_ORDER[i]] = i
}
for (let i = 0; i < CONSONANT_ORDER.length; i++) {
  CHAR_RANK[CONSONANT_ORDER[i]] = 100 + i
}

type SeqMap = Record<string, Record<string, string>>

function getCV(word: string): string {
  return word
    .split('')
    .map(ch => (VOWELS.has(ch) ? 'V' : 'C'))
    .join('')
}

function countVowels(word: string): number {
  return word.split('').filter(ch => VOWELS.has(ch)).length
}

const csvPath = path.resolve(__dirname, '..', '..', '..', 'tune.csv')
const raw = fs.readFileSync(csvPath, 'utf-8')
const records: Array<{ term: string; meaning: string }> = parse(raw, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
})

const map: SeqMap = {}

for (const { term, meaning } of records) {
  if (!term || !meaning) {
    continue
  }

  const seq = getCV(term)

  if (!map[seq]) {
    map[seq] = {}
  }

  map[seq][term] = meaning
}

// Build ordered output: group by syllable count / length, then the rest
const ordered: SeqMap = {}

// 3-letter 1-syllable (1 vowel)
for (const [seq, words] of Object.entries(map)) {
  if (seq.length === 3 && countVowelsInSeq(seq) === 1) {
    ordered[seq] = sortWords(words)
  }
}

// 4-letter 1-syllable
for (const [seq, words] of Object.entries(map)) {
  if (seq.length === 4 && countVowelsInSeq(seq) === 1 && !ordered[seq]) {
    ordered[seq] = sortWords(words)
  }
}

// 5-letter 1-syllable
for (const [seq, words] of Object.entries(map)) {
  if (seq.length === 5 && countVowelsInSeq(seq) === 1 && !ordered[seq]) {
    ordered[seq] = sortWords(words)
  }
}

// CVCVC, CVCVCC, CVCCVC, CCVCVC
const priority = ['CVCVC', 'CVCVCC', 'CVCCVC', 'CCVCVC']
for (const seq of priority) {
  if (map[seq] && !ordered[seq]) {
    ordered[seq] = sortWords(map[seq])
  }
}

// Everything else
for (const [seq, words] of Object.entries(map)) {
  if (!ordered[seq]) {
    ordered[seq] = sortWords(words)
  }
}

function countVowelsInSeq(seq: string): number {
  return seq.split('').filter(ch => ch === 'V').length
}

function compareWords(a: string, b: string): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ra = i < a.length ? (CHAR_RANK[a[i]] ?? 999) : -1
    const rb = i < b.length ? (CHAR_RANK[b[i]] ?? 999) : -1
    if (ra !== rb) return ra - rb
  }
  return 0
}

function sortWords(words: Record<string, string>): Record<string, string> {
  const keys = Object.keys(words).sort(compareWords)
  const sorted: Record<string, string> = {}
  for (const k of keys) {
    sorted[k] = words[k]
  }
  return sorted
}

const outPath = path.resolve(__dirname, '..', '..', '..', 'view', 'word.js')
const json = JSON.stringify(ordered, null, 2)
fs.writeFileSync(outPath, `const LIST = ${json}\n`)

const noteDir = path.resolve(__dirname, '..', '..', '..', 'note', 'moon', 'base')
fs.mkdirSync(noteDir, { recursive: true })
for (const [seq, words] of Object.entries(ordered)) {
  const rows = ['term,meaning']
  for (const [term, meaning] of Object.entries(words)) {
    rows.push(`${term},${meaning}`)
  }
  fs.writeFileSync(path.join(noteDir, `${seq}.csv`), rows.join('\n') + '\n')
}

console.log(
  `Wrote ${Object.keys(ordered).length} sequences to ${outPath} and ${noteDir}/`,
)
