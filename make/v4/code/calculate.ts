/**
 * Builds every v4 base word and writes it to `base/v4/`.
 *
 * Two passes, and both are kept.
 *
 *   full   every word the rules allow, and nothing thrown away
 *   lean   the same list with near copies removed, so no two words
 *          left standing sound alike all the way through
 *
 * `3.ts` and `4.ts` both shuffled the candidates before the lean pass,
 * which spread the survivors across the inventory but meant two runs
 * never agreed. The shuffle here is seeded, so the spread is kept and
 * the answer is the same every time.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/calculate.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  SHAPES,
  VOWELS,
  compareWords,
  holdsHush,
  testWord,
  tooClose,
  type Shape,
} from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(here, '../../../base/v4')

const SEED = 20260914

// ─── Pieces ─────────────────────────────────────────────

/**
 * The single consonants each side allows, before the word rules run.
 * The rules run anyway, so this only saves the loop some work.
 */
const ONSET_SINGLES = CONSONANTS
const CODA_SINGLES = CONSONANTS

type Word = {
  word: string
  shape: Shape
  onset: string
  vowel: string
  coda: string
}

function build(
  shape: Shape,
  onsets: Array<string>,
  codas: Array<string>,
): { words: Array<Word>; gross: number } {
  const words: Array<Word> = []
  let gross = 0
  for (const onset of onsets) {
    for (const vowel of VOWELS) {
      for (const coda of codas) {
        gross++
        const word = onset + vowel + coda
        if (testWord(word).ok) {
          words.push({ word, shape, onset, vowel, coda })
        }
      }
    }
  }
  words.sort((a, b) => compareWords(a.word, b.word))
  return { words, gross }
}

const built: Record<Shape, { words: Array<Word>; gross: number }> = {
  CVC: build('CVC', ONSET_SINGLES, CODA_SINGLES),
  CVCC: build('CVCC', ONSET_SINGLES, CODA_CLUSTERS),
  CCVC: build('CCVC', ONSET_CLUSTERS, CODA_SINGLES),
}

// ─── Lean Pass ──────────────────────────────────────────

/** A small deterministic generator, so the shuffle repeats. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: Array<T>, random: () => number): Array<T> {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Keep a word unless something already kept sounds like it.
 *
 * Only words sharing a shape and carrying the same or a neighbouring
 * vowel can ever be too close, so the kept words are bucketed by vowel
 * and each candidate looks at three buckets rather than the whole list.
 */
function lean(words: Array<Word>): Array<Word> {
  const random = makeRandom(SEED)
  const kept: Array<Word> = []
  const byVowel = new Map<string, Array<Word>>()

  for (const vowel of VOWELS) {
    byVowel.set(vowel, [])
  }

  function nearVowels(vowel: string): Array<string> {
    const at = VOWELS.indexOf(vowel)
    return [at - 1, at, at + 1]
      .filter(i => i >= 0 && i < VOWELS.length)
      .map(i => VOWELS[i])
  }

  for (const candidate of shuffle(words, random)) {
    let close = false
    for (const vowel of nearVowels(candidate.vowel)) {
      for (const other of byVowel.get(vowel) ?? []) {
        if (tooClose(candidate.word, other.word)) {
          close = true
          break
        }
      }
      if (close) {
        break
      }
    }
    if (!close) {
      kept.push(candidate)
      byVowel.get(candidate.vowel)?.push(candidate)
    }
  }

  kept.sort((a, b) => compareWords(a.word, b.word))
  return kept
}

const leaned: Record<Shape, Array<Word>> = {
  CVC: lean(built.CVC.words),
  CVCC: lean(built.CVCC.words),
  CCVC: lean(built.CCVC.words),
}

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

function wordFile(words: Array<Word>): string {
  return ['word', ...words.map(w => w.word)].join('\n') + '\n'
}

function baseFile(words: Array<Word>): string {
  const rows = words.map(w =>
    [w.word, w.shape, w.onset, w.vowel, w.coda].join(','),
  )
  return ['word,shape,onset,vowel,coda', ...rows].join('\n') + '\n'
}

const passes: Array<{ name: string; words: Record<Shape, Array<Word>> }> = [
  {
    name: 'full',
    words: {
      CVC: built.CVC.words,
      CVCC: built.CVCC.words,
      CCVC: built.CCVC.words,
    },
  },
  { name: 'lean', words: leaned },
]

for (const pass of passes) {
  const all: Array<Word> = []
  for (const shape of SHAPES) {
    const words = pass.words[shape]
    all.push(...words)
    write(
      resolve(BASE_DIR, pass.name, `${shape.toLowerCase()}.csv`),
      wordFile(words),
    )
  }
  all.sort((a, b) => compareWords(a.word, b.word))
  write(resolve(BASE_DIR, pass.name, 'base.csv'), baseFile(all))
}

// ─── Cluster Tables ─────────────────────────────────────

function clusterFile(
  clusters: Array<string>,
  used: Set<string>,
): string {
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

const onsetsUsed = new Set(built.CCVC.words.map(w => w.onset))
const codasUsed = new Set(built.CVCC.words.map(w => w.coda))

write(resolve(BASE_DIR, 'onset.csv'), clusterFile(ONSET_CLUSTERS, onsetsUsed))
write(resolve(BASE_DIR, 'coda.csv'), clusterFile(CODA_CLUSTERS, codasUsed))

// ─── Counts ─────────────────────────────────────────────

const countRows = SHAPES.map(shape => {
  const { words, gross } = built[shape]
  return [
    shape,
    gross,
    words.length,
    leaned[shape].length,
  ].join(',')
})

const totals = [
  'all',
  SHAPES.reduce((sum, shape) => sum + built[shape].gross, 0),
  SHAPES.reduce((sum, shape) => sum + built[shape].words.length, 0),
  SHAPES.reduce((sum, shape) => sum + leaned[shape].length, 0),
].join(',')

write(
  resolve(BASE_DIR, 'count.csv'),
  ['shape,gross,full,lean', ...countRows, totals].join('\n') + '\n',
)

// ─── Report ─────────────────────────────────────────────

console.log(`onsets: ${ONSET_CLUSTERS.length} listed, ${onsetsUsed.size} used`)
console.log(`codas:  ${CODA_CLUSTERS.length} listed, ${codasUsed.size} used`)
console.log('')
console.log('| shape | gross | full | lean |')
console.log('| :--- | ---: | ---: | ---: |')
for (const shape of SHAPES) {
  const { words, gross } = built[shape]
  console.log(
    `| \`${shape}\` | ${gross.toLocaleString()} | ` +
      `${words.length.toLocaleString()} | ` +
      `${leaned[shape].length.toLocaleString()} |`,
  )
}
console.log(`| **all** | **${totals.split(',')[1]}** | ` +
  `**${totals.split(',')[2]}** | **${totals.split(',')[3]}** |`)
console.log('')
console.log(`wrote ${BASE_DIR}`)
