/**
 * Word generation for Tune Rock.
 *
 * Rock has 9 sounds and one syllable shape, CV. A root is one, two or
 * three CV syllables built from the five lexical consonants. A surface
 * word is a root with an optional role syllable on the end.
 *
 *   root      ma      mata      matanu
 *   entity    maha    mataha    matanuha
 *   action    mahi    matahi    matanuhi
 *   feature   mahu    matahu    matanuhu
 *
 * There is no compounding. Rock says one thing per word.
 *
 * Rock is small enough that the whole legal space is kept. Talk has to
 * be hand tuned, but Rock does not: the rules in `sound.ts` are exact,
 * so the lexicon is everything that survives them.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/rock/code/calculate.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  ALL_SYLLABLES,
  BEAT,
  BREATH,
  CONSONANTS,
  HUM,
  ROLES,
  ROOT_CONSONANTS,
  ROOT_RULES,
  ROOT_SYLLABLES,
  SOUNDS,
  VOWELS,
  checkCorrespondence,
  compareWords,
  isIntensive,
  toSyllables,
} from '#/make/v3/rock/code/sound'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(__dirname, '../base')

const MAX_SYLLABLES = 3

// ─── Generation ─────────────────────────────────────────

type RootReport = {
  syllables: number
  raw: number
  clear: number
  intensive: number
  cost: Record<string, number>
  words: Array<string>
}

/** Every CV string of the given syllable count, before any rule runs. */
function generateRaw(syllables: number): Array<string> {
  let words = [...ROOT_SYLLABLES]
  for (let i = 1; i < syllables; i++) {
    const next: Array<string> = []
    for (const word of words) {
      for (const syllable of ROOT_SYLLABLES) {
        next.push(word + syllable)
      }
    }
    words = next
  }
  return words
}

/** Run the rules, keeping a count of what each one rejected. */
function generateRoots(syllables: number): RootReport {
  const raw = generateRaw(syllables)
  const cost: Record<string, number> = {}
  for (const rule of ROOT_RULES) {
    cost[rule.name] = 0
  }

  const clear: Array<string> = []
  let intensive = 0

  for (const word of raw) {
    const parts = toSyllables(word)
    /** Each rejection is charged to the first rule that catches it, so
     * the costs add up to exactly raw minus clear. */
    const broke = ROOT_RULES.find(rule => !rule.test(parts))
    if (broke) {
      cost[broke.name]++
    } else {
      clear.push(word)
    }
    if (isIntensive(word)) {
      intensive++
    }
  }

  clear.sort(compareWords)

  return {
    syllables,
    raw: raw.length,
    clear: clear.length,
    intensive,
    cost,
    words: clear,
  }
}

/** A root plus each of its four surface forms. */
function generateForms(roots: Array<string>): {
  bare: Array<string>
  byRole: Record<string, Array<string>>
  all: Array<string>
} {
  const byRole: Record<string, Array<string>> = {}
  const all: Array<string> = [...roots]
  for (const role of ROLES) {
    const forms = roots.map(root => root + role.syllable)
    byRole[role.name] = forms
    all.push(...forms)
  }
  all.sort(compareWords)
  return { bare: [...roots], byRole, all }
}

// ─── Reporting ──────────────────────────────────────────

function countBy(
  words: Array<string>,
  pick: (word: string) => string,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const word of words) {
    const key = pick(word)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

function showCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => `${key}=${n}`)
    .join(' ')
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

rule('SOUNDS')
line(`vowels:     ${VOWELS.join(' ')}`)
line(`hum:        ${HUM.join(' ')}`)
line(`beat:       ${BEAT.join(' ')}`)
line(`breath:     ${BREATH}`)
line(
  `total:      ${SOUNDS.length} sounds, ${CONSONANTS.length} consonants`,
)
line(
  `lexical:    ${ROOT_CONSONANTS.length} consonants, ${ROOT_SYLLABLES.length} syllables`,
)
line(`grammar:    ${ROLES.map(r => r.syllable).join(' ')}`)
line(`all:        ${ALL_SYLLABLES.length} syllables`)

rule('RULES')
for (const item of ROOT_RULES) {
  line(`  ${item.name.padEnd(24)} ${item.note}`)
}

rule('CORRESPONDENCE WITH TUNE TALK')
const check = checkCorrespondence()
if (check.ok) {
  line('every Talk sound has exactly one Rock ancestor')
  line('5 vowels and 22 consonants accounted for, the breath held')
} else {
  for (const error of check.errors) {
    line(`  BROKEN: ${error}`)
  }
  process.exitCode = 1
}

const reports: Array<RootReport> = []
for (let n = 1; n <= MAX_SYLLABLES; n++) {
  reports.push(generateRoots(n))
}

rule('ROOTS')
line('')
line(
  '| syllables | letters | pattern    |   raw |  clear | intensive |',
)
line(
  '| :-------- | :------ | :--------- | ----: | -----: | --------: |',
)
for (const report of reports) {
  const pattern = `\`${'CV'.repeat(report.syllables)}\``
  line(
    `| ${String(report.syllables).padEnd(9)} | ${String(
      report.syllables * 2,
    ).padEnd(7)} | ${pattern.padEnd(10)} | ` +
      `${report.raw.toLocaleString().padStart(5)} | ${report.clear
        .toLocaleString()
        .padStart(6)} | ${String(report.intensive).padStart(9)} |`,
  )
}
const rootTotal = reports.reduce((sum, r) => sum + r.clear, 0)
line(`| | | **total** | | **${rootTotal.toLocaleString()}** | |`)

rule('WHAT EACH RULE COSTS')
line('\nEach rejection is charged to the first rule that catches it.\n')
for (const report of reports) {
  line(
    `  ${report.syllables} syllable, ${
      report.raw - report.clear
    } dropped of ${report.raw}`,
  )
  for (const item of ROOT_RULES) {
    line(
      `    ${item.name.padEnd(26)} ${String(
        report.cost[item.name],
      ).padStart(5)}`,
    )
  }
}

mkdirSync(resolve(BASE_DIR, 'root'), { recursive: true })
mkdirSync(resolve(BASE_DIR, 'word'), { recursive: true })

rule('WORDS')
line('')
line('| root syllables | bare |  ha |  hi |  hu |    all |')
line('| :------------- | ---: | --: | --: | --: | -----: |')

let wordTotal = 0
const byLength = new Map<number, Array<string>>()

for (const report of reports) {
  const forms = generateForms(report.words)
  wordTotal += forms.all.length
  line(
    `| ${String(report.syllables).padEnd(14)} | ${String(
      forms.bare.length,
    ).padStart(4)} | ` +
      ROLES.map(r =>
        String(forms.byRole[r.name].length).padStart(3),
      ).join(' | ') +
      ` | ${forms.all.length.toLocaleString().padStart(6)} |`,
  )

  writeFileSync(
    resolve(BASE_DIR, 'root', `${report.syllables * 2}.csv`),
    'word\n' + report.words.join('\n') + '\n',
  )

  /** Word files go by how long the word actually is, so a bare three
   * syllable root and a two syllable root wearing a role syllable land
   * in the same file. That is the file you want when looking for words
   * of a given number of beats. */
  for (const word of forms.all) {
    const bucket = byLength.get(word.length) ?? []
    bucket.push(word)
    byLength.set(word.length, bucket)
  }
}
line(`| | | | | | **${wordTotal.toLocaleString()}** |`)

for (const [length, words] of byLength) {
  words.sort(compareWords)
  writeFileSync(
    resolve(BASE_DIR, 'word', `${length}.csv`),
    'word\n' + words.join('\n') + '\n',
  )
}
line(
  `\nwrote base/root/*.csv by root length and base/word/*.csv by word length`,
)

rule('SHAPE OF THE LEXICON')
const twoSyllable = reports[1].words
line(`\nfirst sound across two syllable roots:`)
line(`  ${showCounts(countBy(twoSyllable, w => w[0]))}`)
line(`first vowel across two syllable roots:`)
line(`  ${showCounts(countBy(twoSyllable, w => w[1]))}`)
line(`second sound across two syllable roots:`)
line(`  ${showCounts(countBy(twoSyllable, w => w[2]))}`)

rule('BEATS')
line('')
line(
  'Tree is chanted, so what matters is how many beats a word runs to.',
)
line(
  'A bare root of n syllables is n beats. The role syllable adds one.',
)
line('')
line('| beats | shapes            |  count |')
line('| :---- | :---------------- | -----: |')
for (const length of [...byLength.keys()].sort((a, b) => a - b)) {
  const beats = length / 2
  const shapes: Array<string> = []
  for (const report of reports) {
    if (report.syllables === beats) {
      shapes.push('CV'.repeat(beats))
    }
    if (report.syllables === beats - 1) {
      shapes.push(`${'CV'.repeat(beats - 1)}+hV`)
    }
  }
  line(
    `| ${String(beats).padEnd(5)} | ${shapes
      .join(', ')
      .padEnd(17)} | ${byLength
      .get(length)!
      .length.toLocaleString()
      .padStart(6)} |`,
  )
}

rule('SAMPLE')
for (const report of reports) {
  line(
    `\n${
      report.syllables
    } syllable roots (first 24 of ${report.clear.toLocaleString()}):`,
  )
  line(`  ${report.words.slice(0, 24).join(' ')}`)
}

line(`\nfull sets:`)
for (const root of reports[1].words.slice(0, 6)) {
  line(
    `  ${root.padEnd(8)} ${ROLES.map(r => `${root}${r.syllable}`).join(
      '  ',
    )}`,
  )
}
