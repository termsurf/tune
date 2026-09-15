/**
 * Which concepts deserve a root of their own.
 *
 * Tune has 949 atoms picked by hand. Mandarin has an answer to the same
 * question arrived at over a much longer time: a morpheme that turns up
 * in hundreds of compounds is doing the work a root is supposed to do,
 * and one that turns up in two is not.
 *
 * `base/import/language/mandarin/compound-glossary.csv` counts exactly
 * that, 9,268 glosses with the number of compounds each appears in. A
 * gloss standing behind ten or more compounds is a base term by that
 * measure, and there are 2,740 of those.
 *
 * This normalises both lists to the same shape and puts them side by
 * side, so the question becomes a table: which productive concepts does
 * Tune already have a root for, and which is it missing.
 *
 * Normalising means getting a word down to its base form and then
 * doing it again until it stops moving:
 *
 *   words       -> word        plural
 *   standing    -> stand       participle
 *   temporarily -> temporary   adverb
 *   tighten     -> tight       derived verb
 *   sincerity   -> sincere     derived noun
 *
 * The inflectional half is `wink-lemmatizer`. The derivational half is
 * a list of endings, and every strip has to be paid for: the stem is
 * only accepted when the corpus itself has that word somewhere else.
 * So `tighten` becomes `tight` because `tight` is a gloss in its own
 * right, and `river` stays `river` because `riv` is not.
 *
 * Writes `../base/base-term.csv`.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/talk/code/base-term.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

/**
 * `wink-lemmatizer` ships no types, so the three functions it offers
 * are named here rather than in a declaration file.
 */
const lemmatize = createRequire(import.meta.url)('wink-lemmatizer') as {
  noun: (word: string) => string
  verb: (word: string) => string
  adjective: (word: string) => string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = resolve(__dirname, '../../..')
const BASE_DIR = resolve(__dirname, '../base')
/**
 * The languages that have been counted this way. Both build their
 * vocabulary out of one syllable morphemes, which is the same thing
 * Tune is doing, so the count of compounds a morpheme appears in is
 * directly comparable.
 *
 * They are not independent witnesses. A large part of the Vietnamese
 * vocabulary is borrowed from Chinese, so agreement between the two
 * is partly inheritance rather than two languages arriving at the same
 * answer. Agreement is still worth more than either alone, just not as
 * much as it would be from unrelated languages.
 */
const LANGUAGES = ['mandarin', 'vietnamese']

function glossaryPath(language: string): string {
  return resolve(
    PACKAGE_DIR,
    `../../base/import/language/${language}/compound-glossary.csv`,
  )
}

/**
 * Glosses that describe Chinese rather than describe the world. A
 * character glossed `suffix` is being labelled, not translated, and
 * `surname` covers every family name at once. None of them is a
 * concept Tune needs a root for.
 *
 * `measure` is dropped too. It is the classifier slot in both
 * languages, and the count is measuring that rather than the ordinary
 * English word.
 */
const NOT_CONCEPTS = new Set([
  'suffix',
  'prefix',
  'noun',
  'particle',
  'classifier',
  'surname',
  'abbreviation',
  'variant',
  'radical',
  'measure',
])

/** How many compounds a gloss must stand behind to count as a base term. */
const floorAt = process.argv.indexOf('--floor')
const FLOOR = floorAt >= 0 ? Number(process.argv[floorAt + 1]) : 10

function line(text: string) {
  console.log(text)
}

function rule(title: string) {
  line(`\n${'='.repeat(60)}`)
  line(title)
  line('='.repeat(60))
}

// ─── Normalising ────────────────────────────────────────

/**
 * Endings that build one word out of another. Stripping them is only
 * allowed when what is left is a word the corpus already knows, which
 * is what keeps `river` from becoming `riv`.
 *
 * Longest first, so `-ability` is tried before `-ity`.
 */
const ENDINGS: Array<{ from: string; to: Array<string>; min: number }> = [
  { from: 'ability', to: ['able'], min: 3 },
  { from: 'ibility', to: ['ible'], min: 3 },
  { from: 'iness', to: ['y'], min: 3 },
  { from: 'ously', to: ['ous'], min: 4 },
  { from: 'fully', to: ['ful', ''], min: 4 },
  { from: 'lessly', to: ['less'], min: 4 },
  { from: 'ically', to: ['ic', 'ical'], min: 4 },
  { from: 'ily', to: ['y'], min: 4 },
  { from: 'ness', to: [''], min: 3 },
  { from: 'ment', to: [''], min: 3 },
  { from: 'ful', to: [''], min: 3 },
  { from: 'less', to: [''], min: 3 },
  { from: 'tion', to: ['te', 't'], min: 4 },
  { from: 'sion', to: ['de', 'se'], min: 4 },
  { from: 'ance', to: ['', 'e'], min: 4 },
  { from: 'ence', to: ['', 'e'], min: 4 },
  { from: 'ity', to: ['', 'e'], min: 4 },
  { from: 'ly', to: [''], min: 4 },
  { from: 'ous', to: ['', 'e'], min: 5 },
]

/**
 * `-th`, `-al`, `-ic`, `-en`, `-ize` and `-ant` are left out on
 * purpose. They look like suffixes on words where they are not one,
 * and the corpus check does not save you when the wreckage happens to
 * be a real word too: `earth` becomes `ear`, `seal` becomes `see`,
 * `tooth` becomes `too`. Every one of those passed.
 */

/**
 * One pass of getting a word smaller. Inflection first, because it is
 * safe without checking anything, then derivation, which is not.
 */
function reduceOnce(word: string, known: Set<string>): string {
  /** A word ending in a double s is not a plural. `pass` is not the
   * plural of `pas`, and neither is `discuss` of `discus`. */
  const doubled = word.endsWith('ss')

  const asNoun = lemmatize.noun(word)
  if (!doubled && asNoun && asNoun !== word && asNoun.length >= 3) {
    return asNoun
  }

  /**
   * When the word is already a noun in its base form, leave it alone.
   * `ground` is a place before it is the past of `grind`, and `seal`
   * and `early` and `earth` are all words in their own right that the
   * verb and adjective tables will happily take apart.
   */
  const settled = asNoun === word

  if (!settled) {
    for (const lemma of [lemmatize.verb(word), lemmatize.adjective(word)]) {
      if (lemma && lemma !== word && lemma.length >= 3) {
        return lemma
      }
    }
  }

  for (const ending of ENDINGS) {
    if (!word.endsWith(ending.from)) {
      continue
    }
    const stem = word.slice(0, word.length - ending.from.length)
    if (stem.length < ending.min) {
      continue
    }
    for (const tail of ending.to) {
      const candidate = stem + tail
      if (
        candidate.length >= ending.min &&
        candidate !== word &&
        known.has(candidate)
      ) {
        return candidate
      }
    }
  }

  return word
}

/** Keep going until it stops moving. */
function normalise(word: string, known: Set<string>): string {
  let current = word
  for (let i = 0; i < 6; i++) {
    const next = reduceOnce(current, known)
    if (next === current) {
      break
    }
    current = next
  }
  return current
}

/**
 * Tune's glosses carry notes the Mandarin ones do not: `map (map/reduce)`
 * and `together/bind` and `horn (animal)`. The head of the gloss is what
 * lines up with a Mandarin morpheme.
 */
function toHead(gloss: string): string {
  return gloss
    .replace(/\([^)]*\)/g, ' ')
    .split('/')[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim()
}

// ─── Reading ────────────────────────────────────────────

function splitRow(row: string): Array<string> {
  const cell: Array<string> = []
  let current = ''
  let quoted = false
  for (const ch of row) {
    if (ch === '"') {
      quoted = !quoted
    } else if (ch === ',' && !quoted) {
      cell.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cell.push(current)
  return cell
}

type Gloss = { text: string; count: number; language: string }

const glossary: Array<Gloss> = []
for (const language of LANGUAGES) {
  for (const row of readFileSync(glossaryPath(language), 'utf-8')
    .split('\n')
    .slice(1)) {
    const cell = splitRow(row)
    if (!cell[0] || !cell[1]) {
      continue
    }
    glossary.push({
      text: cell[0].trim().toLowerCase(),
      count: Number(cell[1]),
      language,
    })
  }
}

type Atom = { atom: string; meaning: string; head: string }

const atoms: Array<Atom> = []
for (const row of readFileSync(resolve(PACKAGE_DIR, 'tune.3.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cell = splitRow(row)
  if (!cell[0] || !cell[1]) {
    continue
  }
  atoms.push({ atom: cell[0], meaning: cell[1], head: toHead(cell[1]) })
}

/**
 * Every word either list knows, which is what a derivational strip is
 * checked against.
 */
const known = new Set<string>()
for (const item of glossary) {
  known.add(item.text)
}
for (const item of atoms) {
  if (item.head) {
    known.add(item.head)
  }
  for (const part of item.head.split(' ')) {
    if (part.length >= 3) {
      known.add(part)
    }
  }
}

// ─── Run ────────────────────────────────────────────────

rule('SOURCES')
line('')
for (const language of LANGUAGES) {
  const mine = glossary.filter(g => g.language === language)
  const strong = mine.filter(g => g.count >= FLOOR && !NOT_CONCEPTS.has(g.text))
  line(
    `  ${language.padEnd(11)} ${mine.length.toLocaleString().padStart(6)} glosses, ` +
      `${strong.length.toLocaleString().padStart(5)} of them behind ${FLOOR} compounds or more`,
  )
}
line(`  ${'tune'.padEnd(11)} ${atoms.length.toLocaleString().padStart(6)} atoms`)
line('')
line(`  ${glossary.filter(g => g.count >= FLOOR && NOT_CONCEPTS.has(g.text)).length} glosses label the language rather than name a thing, and are dropped`)
line(`  ${known.size.toLocaleString()} distinct words in all, used to check every strip`)

rule('NORMALISING')

const shifted = new Map<string, string>()

/** Per language, then per base term. */
const counted = new Map<string, Map<string, number>>()
for (const language of LANGUAGES) {
  counted.set(language, new Map())
}

for (const item of glossary) {
  if (item.count < FLOOR || NOT_CONCEPTS.has(item.text)) {
    continue
  }
  const base = normalise(item.text, known)
  if (base !== item.text) {
    shifted.set(item.text, base)
  }
  const held = counted.get(item.language)!
  held.set(base, (held.get(base) ?? 0) + item.count)
}

const tune = new Map<string, Array<Atom>>()
for (const item of atoms) {
  if (!item.head) {
    continue
  }
  const base = normalise(item.head, known)
  if (base !== item.head) {
    shifted.set(item.head, base)
  }
  tune.set(base, [...(tune.get(base) ?? []), item])
}

line(`\n  ${shifted.size} words moved to a smaller form`)
for (const language of LANGUAGES) {
  line(`  ${language.padEnd(11)} folds to ${counted.get(language)!.size.toLocaleString()} base terms`)
}
line(`  ${'tune'.padEnd(11)} folds to ${tune.size.toLocaleString()} base terms`)
line('')
for (const [from, to] of [...shifted].slice(0, 18)) {
  line(`    ${from.padEnd(16)} -> ${to}`)
}

// ─── Merge ──────────────────────────────────────────────

type Term = {
  term: string
  atom: string
  meaning: string
  counts: Record<string, number>
  total: number
  languages: number
  source: 'both' | 'gloss' | 'tune'
}

const every = new Set<string>([...tune.keys()])
for (const language of LANGUAGES) {
  for (const term of counted.get(language)!.keys()) {
    every.add(term)
  }
}

const all: Array<Term> = []
for (const term of every) {
  const counts: Record<string, number> = {}
  let total = 0
  let languages = 0
  for (const language of LANGUAGES) {
    const n = counted.get(language)!.get(term) ?? 0
    counts[language] = n
    total += n
    if (n > 0) {
      languages++
    }
  }
  const held = tune.get(term)
  all.push({
    term,
    atom: held ? held.map(a => a.atom).join(' ') : '',
    meaning: held ? held[0].meaning : '',
    counts,
    total,
    languages,
    source: held && languages > 0 ? 'both' : held ? 'tune' : 'gloss',
  })
}

/**
 * Terms both languages build on come first, because two languages
 * agreeing is worth more than one language insisting. Within that,
 * the more productive the better.
 */
all.sort(
  (a, b) =>
    b.languages - a.languages ||
    b.total - a.total ||
    a.term.localeCompare(b.term),
)

rule('WHERE THEY AGREE')

const inGloss = all.filter(t => t.languages > 0)
const agreed = all.filter(t => t.languages === LANGUAGES.length)
const covered = all.filter(t => t.source === 'both')
const gaps = all.filter(t => t.source === 'gloss')
const onlyTune = all.filter(t => t.source === 'tune')

line(`\n  ${all.length.toLocaleString()} base terms in all`)
line(`  ${inGloss.length.toLocaleString()} at least one language builds on`)
line(`  ${agreed.length.toLocaleString()} both languages build on`)
line('')
line(`  ${covered.length.toLocaleString()} Tune has a root for and a language builds on`)
line(`  ${gaps.length.toLocaleString()} a language builds on and Tune has no root for`)
line(`  ${onlyTune.length.toLocaleString()} Tune has a root for and neither language builds on`)
line('')
line(
  `  ${((covered.length / inGloss.length) * 100).toFixed(1)}% of what these languages treat as a base term is covered`,
)

const agreedCovered = agreed.filter(t => t.source === 'both').length
line(
  `  ${((agreedCovered / agreed.length) * 100).toFixed(1)}% of what BOTH languages agree on is covered`,
)

rule('THE BIGGEST GAPS BOTH LANGUAGES AGREE ON')
line('\n  These are the strongest case for a new root: productive in')
line('  both languages, and Tune has nothing.\n')
line(`    ${'total'.padStart(6)} ${LANGUAGES.map(l => l.slice(0, 4).padStart(6)).join(' ')}  term`)
for (const item of gaps.filter(t => t.languages === LANGUAGES.length).slice(0, 40)) {
  line(
    `    ${String(item.total).padStart(6)} ${LANGUAGES.map(l => String(item.counts[l]).padStart(6)).join(' ')}  ${item.term}`,
  )
}

rule('ONE LANGUAGE ONLY')
line('\n  Productive in one and not the other, so weaker evidence:\n')
for (const item of gaps.filter(t => t.languages === 1).slice(0, 20)) {
  const which = LANGUAGES.find(l => item.counts[l] > 0)!
  line(`    ${String(item.total).padStart(6)}  ${item.term.padEnd(16)} ${which} only`)
}

rule('CARRYING THE MOST')
line('\n  Productive in both, and Tune has it:\n')
for (const item of covered.filter(t => t.languages === LANGUAGES.length).slice(0, 25)) {
  line(
    `    ${String(item.total).padStart(6)}  ${item.term.padEnd(14)} ${item.atom}`,
  )
}

// ─── Out ────────────────────────────────────────────────

const rows = [
  ['term', 'atom', 'meaning', ...LANGUAGES, 'total', 'languages', 'source'].join(','),
]
for (const item of all) {
  rows.push(
    [
      item.term,
      item.atom,
      item.meaning,
      ...LANGUAGES.map(l => String(item.counts[l])),
      String(item.total),
      String(item.languages),
      item.source,
    ]
      .map(c => (c.includes(',') ? `"${c}"` : c))
      .join(','),
  )
}

mkdirSync(BASE_DIR, { recursive: true })
const outPath = resolve(BASE_DIR, 'base-term.csv')
writeFileSync(outPath, rows.join('\n') + '\n')

rule('OUT')
line(`\n  ${rows.length - 1} base terms -> ${outPath}`)
line('')
line(`  columns: term, atom, meaning, ${LANGUAGES.join(', ')}, total, languages, source`)
line('  each language column is how many compounds the concept stands')
line('  behind there. `languages` is how many of them build on it at')
line('  all, and two is a much stronger case for a root than one.')
