/**
 * How many one syllable words Tune Moon allows.
 *
 * Three letters is `CVC`. Four letters is `CVCC` or `CCVC`. Those are
 * the only shapes of that length among Moon's eight, so the question
 * of how many short words the language has room for is a count over
 * three shapes.
 *
 * The count is given twice, because the rules do not yet say
 * everything.
 *
 *   by rule       the syllable rules in `sound.ts` and nothing else,
 *                 which lets any consonant sit beside any other
 *   by cluster    the same, restricted to consonant pairs the lexicon
 *                 actually uses
 *
 * The first is the ceiling. The second is the realistic figure, and it
 * is far smaller, which is a way of saying Moon has cluster rules that
 * have never been written down.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/talk/code/space.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  CONSONANTS,
  SHAPES,
  countSyllables,
  VOWELS,
  compareWords,
  testCodaCluster,
  testOnsetCluster,
  testSounding,
  tooClose,
  toShape,
} from '#/make/talk/code/sound'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = resolve(__dirname, '../../..')
const BASE_DIR = resolve(__dirname, '../base')

function line(text: string) {
  console.log(text)
}

function rule(title: string) {
  line(`\n${'='.repeat(60)}`)
  line(title)
  line('='.repeat(60))
}

// ─── The Lexicon, For Comparison ────────────────────────

const lexicon = new Set<string>()
const meaning = new Map<string, string>()
const onsets = new Map<string, number>()
const codas = new Map<string, number>()

for (const row of readFileSync(resolve(PACKAGE_DIR, 'tune.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const term = (row.split(',')[1] ?? '').trim()
  if (!term) {
    continue
  }
  lexicon.add(term)
  if (!meaning.has(term)) {
    meaning.set(term, (row.split(',')[2] ?? '').trim())
  }

  /** Every pair of consonants that meets, wherever it meets. A pair
   * before the first vowel is an onset, one after the last is a coda. */
  const shape = toShape(term)
  if (!shape) {
    continue
  }
  const firstVowel = shape.indexOf('V')
  const lastVowel = shape.lastIndexOf('V')
  for (let i = 0; i + 1 < term.length; i++) {
    if (shape[i] !== 'C' || shape[i + 1] !== 'C') {
      continue
    }
    const pair = term[i] + term[i + 1]
    if (i + 1 < firstVowel) {
      onsets.set(pair, (onsets.get(pair) ?? 0) + 1)
    } else if (i > lastVowel) {
      codas.set(pair, (codas.get(pair) ?? 0) + 1)
    }
  }
}

// ─── Enumeration ────────────────────────────────────────

/** Every filling of a shape, before any rule runs. */
function fill(shape: string): Array<string> {
  let words: Array<string> = ['']
  for (const slot of shape) {
    const pool = slot === 'V' ? VOWELS : CONSONANTS
    const next: Array<string> = []
    for (const word of words) {
      for (const sound of pool) {
        next.push(word + sound)
      }
    }
    words = next
  }
  return words
}

type Count = {
  shape: string
  raw: number
  sounding: number
  clustered: number
  words: Array<string>
  used: number
}

/** Every word of a shape that survives the syllable and cluster rules. */
function count(shape: string): Count {
  const filled = fill(shape)
  const firstVowel = shape.indexOf('V')
  const lastVowel = shape.lastIndexOf('V')

  let sounding = 0
  const words: Array<string> = []

  for (const word of filled) {
    if (!testSounding(word).ok) {
      continue
    }
    sounding++

    let ok = true
    for (let i = 0; i + 1 < word.length; i++) {
      if (shape[i] !== 'C' || shape[i + 1] !== 'C') {
        continue
      }
      const a = word[i]
      const b = word[i + 1]
      const cluster = a + b
      const good =
        i + 1 <= firstVowel
          ? testOnsetCluster(cluster)
          : i >= lastVowel
            ? testCodaCluster(cluster)
            : true
      if (!good) {
        ok = false
        break
      }
    }
    if (ok) {
      words.push(word)
    }
  }

  words.sort(compareWords)

  return {
    shape,
    raw: filled.length,
    sounding,
    clustered: words.length,
    words,
    used: words.filter(w => lexicon.has(w)).length,
  }
}

/**
 * Thin a set of words until no two are one pair swap apart.
 *
 * Words are taken in order and a word is kept only when nothing
 * already kept is a single swap away from it, so `star` keeps its
 * place and `stal` gives way. Taking them in a fixed order makes the
 * count the same on every run.
 */
function spread(words: Array<string>): Array<string> {
  const kept: Array<string> = []
  /** Words the language already uses go first, so thinning never
   * throws out a real word to make room for one nobody has said. */
  const order = [
    ...words.filter(w => lexicon.has(w)),
    ...words.filter(w => !lexicon.has(w)),
  ]
  for (const word of order) {
    if (!kept.some(held => tooClose(held, word))) {
      kept.push(word)
    }
  }
  return kept.sort(compareWords)
}

// ─── Run ────────────────────────────────────────────────

/** Every shape of one syllable, which is every shape but the two that
 * carry a second vowel. */
const SHORT = SHAPES.filter(s => countSyllables(s) === 1)

rule('SHAPES')
line(`\n  Moon has ${SHAPES.length} shapes. ${SHORT.length} are three or four letters.`)
line(`  ${SHORT.join(' ')}`)
line('')
line(`  ${VOWELS.length} vowels, ${CONSONANTS.length} consonants`)

const counts = SHORT.map(count)
const spreads = new Map<string, Array<string>>()
for (const item of counts) {
  spreads.set(
    item.shape,
    item.shape.length === 4 ? spread(item.words) : item.words,
  )
}
/** Count what is in use against the set that survives every rule. */
for (const item of counts) {
  const final = new Set(spreads.get(item.shape))
  item.used = [...lexicon].filter(w => final.has(w)).length
}

rule('HOW MANY WORDS')
line('')
line('| letters | shape  |    all | sayable | clustered | spread |  used |')
line('| :------ | :----- | -----: | ------: | --------: | -----: | ----: |')
for (const item of counts) {
  line(
    `| ${String(item.shape.length).padEnd(7)} | \`${item.shape}\`${' '.repeat(5 - item.shape.length)} | ` +
      `${item.raw.toLocaleString().padStart(6)} | ${item.sounding.toLocaleString().padStart(7)} | ` +
      `${item.clustered.toLocaleString().padStart(9)} | ${spreads.get(item.shape)!.length.toLocaleString().padStart(6)} | ` +
      `${item.used.toLocaleString().padStart(5)} |`,
  )
}

for (const length of [3, 4]) {
  const group = counts.filter(c => c.shape.length === length)
  const sum = (pick: (c: Count) => number) => group.reduce((n, c) => n + pick(c), 0)
  const spreadSum = group.reduce((n, c) => n + spreads.get(c.shape)!.length, 0)
  line(
    `| **${length}** | | ${sum(c => c.raw).toLocaleString().padStart(6)} | ` +
      `${sum(c => c.sounding).toLocaleString().padStart(7)} | ` +
      `${sum(c => c.clustered).toLocaleString().padStart(9)} | ` +
      `${spreadSum.toLocaleString().padStart(6)} | ` +
      `${sum(c => c.used).toLocaleString().padStart(5)} |`,
  )
}

rule('WHAT EACH RULE COSTS')
line('')
line('  all         every filling of the shape, before any rule')
line('  sayable     after the syllable rules: no q opening, no y h or w')
line('              closing, no il el ir or er rhyme')
line('  clustered   after the cluster lists: only the onsets and codas')
line('              Moon actually allows')
line('  spread      four letter words only, thinned so no two words are')
line('              alike all the way through, which is what keeps star')
line('              and stal from both existing')
line('')
const raw = counts.reduce((n, c) => n + c.raw, 0)
const sounding = counts.reduce((n, c) => n + c.sounding, 0)
const clustered = counts.reduce((n, c) => n + c.clustered, 0)
const spreadAll = counts.reduce((n, c) => n + spreads.get(c.shape)!.length, 0)
line(`  ${raw.toLocaleString()} -> ${sounding.toLocaleString()} -> ${clustered.toLocaleString()} -> ${spreadAll.toLocaleString()}`)
line('')
line(`  syllable rules cut ${(((raw - sounding) / raw) * 100).toFixed(1)}%`)
line(`  cluster rules cut ${(((sounding - clustered) / sounding) * 100).toFixed(1)}% of what was left`)
line(`  spreading cuts ${(((clustered - spreadAll) / clustered) * 100).toFixed(1)}% more`)

rule('ROOM LEFT')
line('')
for (const length of [3, 4]) {
  const group = counts.filter(c => c.shape.length === length)
  const space = group.reduce((n, c) => n + spreads.get(c.shape)!.length, 0)
  const used = group.reduce((n, c) => n + c.used, 0)
  line(
    `  ${length} letters: ${used.toLocaleString()} used of ${space.toLocaleString()}, ` +
      `${(space - used).toLocaleString()} free`,
  )
}
line('')
line(`  ${spreadAll.toLocaleString()} one syllable words in all.`)

// ─── Out ────────────────────────────────────────────────

/**
 * Every one syllable word Moon allows.
 *
 * Both datasets are written, because they answer different questions.
 * `clustered` is everything the rules allow, which is the ceiling.
 * `distinct` is what is left once no two words are alike all the way
 * through, which is what a lexicon can actually use. The `distinct`
 * column says which of the two a word is in, so filtering the file one
 * way gives the smaller set and not filtering gives the larger.
 *
 * One file per shape, and one holding all of them.
 */
mkdirSync(resolve(BASE_DIR, 'word'), { recursive: true })

const everyRow: Array<{ word: string; shape: string; far: boolean }> = []
for (const item of counts) {
  const far = new Set(spreads.get(item.shape))
  const rows = ['word,shape,distinct,meaning']
  for (const word of item.words) {
    const gloss = meaning.get(word) ?? ''
    rows.push(
      `${word},${item.shape},${far.has(word) ? 'yes' : 'no'},${gloss.includes(',') ? `"${gloss}"` : gloss}`,
    )
    everyRow.push({ word, shape: item.shape, far: far.has(word) })
  }
  writeFileSync(
    resolve(BASE_DIR, 'word', `${item.shape}.csv`),
    rows.join('\n') + '\n',
  )
}

/** Three letters first, then four, in Tune's own alphabet within each. */
everyRow.sort(
  (a, b) => a.word.length - b.word.length || compareWords(a.word, b.word),
)

const wordRows = ['word,shape,distinct,meaning']
for (const item of everyRow) {
  const gloss = meaning.get(item.word) ?? ''
  wordRows.push(
    `${item.word},${item.shape},${item.far ? 'yes' : 'no'},${gloss.includes(',') ? `"${gloss}"` : gloss}`,
  )
}

const wordPath = resolve(BASE_DIR, 'word.csv')
writeFileSync(wordPath, wordRows.join('\n') + '\n')

rule('OUT')
line('')
line('| shape  | by the rules | of those, distinct |')
line('| :----- | -----------: | -----------------: |')
for (const item of counts) {
  line(
    `| \`${item.shape}\`${' '.repeat(5 - item.shape.length)} | ${item.clustered.toLocaleString().padStart(12)} | ${spreads.get(item.shape)!.length.toLocaleString().padStart(18)} |`,
  )
}
line(
  `| **all** | **${everyRow.length.toLocaleString()}** | **${everyRow.filter(r => r.far).length.toLocaleString()}** |`,
)
line('')
line(`  ${everyRow.length.toLocaleString()} words -> ${wordPath}`)
for (const item of counts) {
  line(`  ${item.words.length.toLocaleString().padStart(6)} -> base/word/${item.shape}.csv`)
}
line('')
line('  `distinct` says whether the word survives the closeness rule.')
line('  Keep every row for the full space, keep `yes` for a lexicon.')

rule('AGAINST THE LEXICON')
line('')
for (const item of counts) {
  const legal = new Set(item.words)
  const inUse = [...lexicon].filter(w => toShape(w) === item.shape)
  const outside = inUse.filter(w => !legal.has(w))
  line(
    `  ${item.shape.padEnd(5)} ${String(inUse.length).padStart(4)} in tune.csv, ` +
      `${String(outside.length).padStart(4)} of them break a rule`,
  )
  if (outside.length > 0) {
    line(`        ${outside.slice(0, 16).join(' ')}`)
  }
}
