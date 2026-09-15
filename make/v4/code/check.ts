/**
 * Reads `base/v4/` back off disk and proves it.
 *
 * The generator is not asked whether it did its job. The files are, and
 * every claim the readme makes is one of the checks below.
 *
 *   1. every word is one of the three shapes
 *   2. every word passes every word rule
 *   3. every cluster used is one of the listed ones
 *   4. no word appears twice, and no word appears under two shapes
 *   5. the lean list is a subset of the full list
 *   6. no two lean words are too close
 *   7. the full list is complete, so nothing the rules allow is missing
 *   8. `count.csv` agrees with the files it counts
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/check.ts
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  SHAPES,
  VOWELS,
  testWord,
  toShape,
  tooClose,
  type Shape,
} from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(here, '../../../base/v4')

const broke: Array<string> = []

function hold(ok: boolean, note: string) {
  if (!ok) {
    broke.push(note)
  }
}

function read(path: string): Array<string> {
  return readFileSync(resolve(BASE_DIR, path), 'utf-8')
    .split('\n')
    .slice(1)
    .map(line => line.trim())
    .filter(Boolean)
}

const passes = ['full', 'lean'] as const

const words: Record<string, Record<Shape, Array<string>>> = {
  full: { CVC: [], CVCC: [], CCVC: [] },
  lean: { CVC: [], CVCC: [], CCVC: [] },
}

for (const pass of passes) {
  for (const shape of SHAPES) {
    words[pass][shape] = read(`${pass}/${shape.toLowerCase()}.csv`)
  }
}

// ─── 1, 2, 3: Every Word ────────────────────────────────

for (const pass of passes) {
  for (const shape of SHAPES) {
    for (const word of words[pass][shape]) {
      hold(toShape(word) === shape, `${pass}/${shape}: ${word} is not ${shape}`)

      const test = testWord(word)
      hold(test.ok, `${pass}/${shape}: ${word} breaks ${test.broke.join(' ')}`)

      if (shape === 'CCVC') {
        const onset = word.slice(0, 2)
        hold(
          ONSET_CLUSTERS.includes(onset),
          `${pass}: ${word} opens on the unlisted ${onset}`,
        )
      }
      if (shape === 'CVCC') {
        const coda = word.slice(2)
        hold(
          CODA_CLUSTERS.includes(coda),
          `${pass}: ${word} closes on the unlisted ${coda}`,
        )
      }
    }
  }
}

// ─── 4: No Repeats ──────────────────────────────────────

for (const pass of passes) {
  const seen = new Set<string>()
  for (const shape of SHAPES) {
    for (const word of words[pass][shape]) {
      hold(!seen.has(word), `${pass}: ${word} appears twice`)
      seen.add(word)
    }
  }
}

// ─── 5: Lean Sits Inside Full ───────────────────────────

for (const shape of SHAPES) {
  const full = new Set(words.full[shape])
  for (const word of words.lean[shape]) {
    hold(full.has(word), `lean/${shape}: ${word} is not in the full list`)
  }
}

// ─── 6: Nothing Left Is Too Close ───────────────────────

for (const shape of SHAPES) {
  const list = words.lean[shape]
  const byVowel = new Map<string, Array<string>>()
  for (const vowel of VOWELS) {
    byVowel.set(vowel, [])
  }

  function vowelOf(word: string): string {
    return [...word].find(sound => VOWELS.includes(sound)) ?? ''
  }

  for (const word of list) {
    const at = VOWELS.indexOf(vowelOf(word))
    for (const i of [at - 1, at, at + 1]) {
      if (i < 0 || i >= VOWELS.length) {
        continue
      }
      for (const other of byVowel.get(VOWELS[i]) ?? []) {
        hold(
          !tooClose(word, other),
          `lean/${shape}: ${word} and ${other} are too close`,
        )
      }
    }
    byVowel.get(vowelOf(word))?.push(word)
  }
}

// ─── 7: The Full List Is Complete ───────────────────────

const want: Record<Shape, Array<string>> = { CVC: [], CVCC: [], CCVC: [] }

for (const onset of CONSONANTS) {
  for (const vowel of VOWELS) {
    for (const coda of CONSONANTS) {
      const word = onset + vowel + coda
      if (testWord(word).ok) {
        want.CVC.push(word)
      }
    }
    for (const coda of CODA_CLUSTERS) {
      const word = onset + vowel + coda
      if (testWord(word).ok) {
        want.CVCC.push(word)
      }
    }
  }
}

for (const onset of ONSET_CLUSTERS) {
  for (const vowel of VOWELS) {
    for (const coda of CONSONANTS) {
      const word = onset + vowel + coda
      if (testWord(word).ok) {
        want.CCVC.push(word)
      }
    }
  }
}

for (const shape of SHAPES) {
  const have = new Set(words.full[shape])
  hold(
    have.size === want[shape].length,
    `full/${shape}: holds ${have.size} words, the rules allow ${want[shape].length}`,
  )
  for (const word of want[shape]) {
    hold(have.has(word), `full/${shape}: ${word} is allowed but missing`)
  }
}

// ─── 8: The Counts Agree ────────────────────────────────

for (const row of read('count.csv')) {
  const [shape, , full, lean] = row.split(',')
  if (shape === 'all') {
    const fullAll = SHAPES.reduce((n, s) => n + words.full[s].length, 0)
    const leanAll = SHAPES.reduce((n, s) => n + words.lean[s].length, 0)
    hold(Number(full) === fullAll, `count.csv: all full says ${full}, is ${fullAll}`)
    hold(Number(lean) === leanAll, `count.csv: all lean says ${lean}, is ${leanAll}`)
    continue
  }
  const at = shape as Shape
  hold(
    Number(full) === words.full[at].length,
    `count.csv: ${shape} full says ${full}, is ${words.full[at].length}`,
  )
  hold(
    Number(lean) === words.lean[at].length,
    `count.csv: ${shape} lean says ${lean}, is ${words.lean[at].length}`,
  )
}

// ─── Say So ─────────────────────────────────────────────

if (broke.length > 0) {
  console.error(`${broke.length} checks failed`)
  for (const note of broke.slice(0, 40)) {
    console.error(`  ${note}`)
  }
  process.exit(1)
}

const counted = passes
  .map(
    pass =>
      `${pass} ${SHAPES.reduce((n, s) => n + words[pass][s].length, 0)}`,
  )
  .join(', ')

console.log(`every check holds over ${counted}`)
