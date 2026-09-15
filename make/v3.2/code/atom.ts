/**
 * The atomic root list.
 *
 * Tune Moon holds six thousand terms, but most of them are not atoms.
 * `waterfall` does not need a root when `water` and `fall` already
 * have one. What the language actually needs is a few hundred semantic
 * primitives, every one of them short, and everything else built out
 * of two or three of those.
 *
 * `base/atom-draft.csv` is the hand picked inventory: 839 concepts
 * across eighteen domains, most of them already matched to a term in
 * `tune.tsv`. This finishes that job.
 *
 * The rule is that an atom is short. A root worth having is worth
 * three letters, and four at the outside, because every compound built
 * from it pays its length twice over. So:
 *
 *   held        the draft already gave it a 3 or 4 letter term
 *   shortened   the draft gave it a longer term, replaced with the
 *               closest short one still free
 *   filled      the draft had no term, one was assigned
 *
 * Nothing is invented. Every term comes from `tune.tsv`, so the atom
 * list is a choice about which of Moon's existing short words carry
 * the weight, not a new vocabulary.
 *
 * Writes `tune.3.csv` at the root of the package.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/moon/code/atom.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  consonantSimilarityAt,
  vowelSimilarity,
} from '#/code/similarity'
import { isVowel, testSounding } from '#/make/moon/code/sound'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = resolve(__dirname, '../../..')
const BASE_DIR = resolve(__dirname, '../base')

/** How long an atom is allowed to be, best first. */
const ATOM_LENGTHS = [3, 4]

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

type Draft = {
  category: string
  term: string
  meaning: string
  source: string
  status: string
  language: string
}

function readDraft(path: string): Array<Draft> {
  const lines = readFileSync(path, 'utf-8').split('\n').filter(l => l.trim())
  const header = splitRow(lines[0])
  const at = (name: string) => header.indexOf(name)
  return lines.slice(1).map(row => {
    const cell = splitRow(row)
    return {
      category: cell[at('category')] ?? '',
      term: (cell[at('term')] ?? '').trim(),
      meaning: (cell[at('meaning')] ?? '').trim(),
      source: (cell[at('source_meaning')] ?? '').trim(),
      status: (cell[at('status')] ?? '').trim(),
      language: (cell[at('language')] ?? '').trim(),
    }
  })
}

/** Every term in the Moon lexicon, with what it currently means. */
function readTune(path: string): Map<string, string> {
  const table = new Map<string, string>()
  const lines = readFileSync(path, 'utf-8').split('\n')
  for (const line of lines.slice(1)) {
    const cell = line.split('\t').map(c => c.trim())
    if (cell.length < 3 || !cell[1]) {
      continue
    }
    if (!table.has(cell[1])) {
      table.set(cell[1], cell[2])
    }
  }
  return table
}

// ─── Scoring ────────────────────────────────────────────

function toConsonants(word: string): Array<string> {
  return [...word].filter(s => !isVowel(s))
}

function toVowels(word: string): Array<string> {
  return [...word].filter(s => isVowel(s))
}

/**
 * How close a short term sits to the longer one it is replacing.
 *
 * The first and last consonants carry a word, so they carry the
 * weight. A term that keeps `p` and `z` from `purpoz` reads as the
 * same word shortened, and one that keeps neither does not.
 */
function score(candidate: string, want: string): number {
  const a = toConsonants(candidate)
  const b = toConsonants(want)
  const av = toVowels(candidate)
  const bv = toVowels(want)

  let total = 0
  let weight = 0

  /** Front against front, back against back, so a two consonant term
   * is judged on the two consonants that matter in a longer one. */
  if (a.length > 0 && b.length > 0) {
    total += consonantSimilarityAt(a[0], b[0], 'onset') * 5
    weight += 500
    total +=
      consonantSimilarityAt(a[a.length - 1], b[b.length - 1], 'coda') * 4
    weight += 400
  }
  for (let i = 1; i < a.length - 1; i++) {
    const other = b[i] ?? b[b.length - 1]
    total += consonantSimilarityAt(a[i], other, 'onset') * 2
    weight += 200
  }
  for (let i = 0; i < av.length; i++) {
    total += vowelSimilarity(av[i], bv[i] ?? bv[0] ?? 'a')
    weight += 100
  }

  /** Shorter is better, that being the whole point. */
  return (total / Math.max(1, weight)) * 100 - candidate.length * 2
}

// ─── Run ────────────────────────────────────────────────

function line(text: string) {
  console.log(text)
}

function rule(title: string) {
  line(`\n${'='.repeat(60)}`)
  line(title)
  line('='.repeat(60))
}

const draft = readDraft(resolve(BASE_DIR, 'atom-draft.csv'))
const tune = readTune(resolve(PACKAGE_DIR, 'tune.tsv'))

/** Terms the draft already claims, so nothing is handed out twice. */
const taken = new Set<string>()
const duplicates: Array<Draft> = []
for (const item of draft) {
  if (!item.term) {
    continue
  }
  if (taken.has(item.term)) {
    duplicates.push(item)
    item.term = ''
  } else {
    taken.add(item.term)
  }
}

const free: Record<number, Array<string>> = {}
for (const length of ATOM_LENGTHS) {
  free[length] = [...tune.keys()]
    .filter(t => t.length === length && !taken.has(t) && testSounding(t).ok)
    .sort()
}

rule('SUPPLY')
line(`\n  ${draft.length} concepts in the draft`)
line(`  ${tune.size.toLocaleString()} terms in tune.tsv`)
for (const length of ATOM_LENGTHS) {
  const all = [...tune.keys()].filter(t => t.length === length).length
  line(`  ${all} terms of ${length} letters, ${free[length].length} of them free`)
}
if (duplicates.length > 0) {
  line(`\n  ${duplicates.length} concepts had a term already claimed by another, released:`)
  for (const item of duplicates) {
    line(`    ${item.meaning}`)
  }
}

// ─── Numbers ────────────────────────────────────────────

/**
 * The numbers already have their own shape in `tune.csv`, and it is
 * deliberate: the sixteen numerals are three letters and the powers of
 * ten are four. That is worth keeping, so the numbers are read
 * straight out of the lexicon and their terms are reserved before
 * anything else is handed out.
 *
 * Counting runs in sixteens, which is why the numerals run to fifteen
 * rather than nine.
 */
const NUMERALS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen',
]

type Number = { term: string; meaning: string; kind: 'numeral' | 'power' }

/**
 * A power of ten, written either as `10^6` or spelled out as `1000`.
 * The two spellings are kept apart on purpose: `txaz` for a hundred and
 * `york` for ten squared are two words the lexicon actually has, and
 * folding them together loses one of them.
 */
function toPower(meaning: string): string | null {
  return /^10\^\d+$/.test(meaning) || /^1(0+)$/.test(meaning)
    ? meaning
    : null
}

function readNumbers(path: string): Array<Number> {
  const found: Array<Number> = []
  for (const row of readFileSync(path, 'utf-8').split('\n').slice(1)) {
    const cell = row.split(',').map(c => c.trim())
    if (cell[0] !== 'number' || !cell[1]) {
      continue
    }
    const power = toPower(cell[2])
    if (power) {
      found.push({ term: cell[1], meaning: power, kind: 'power' })
    } else if (NUMERALS.includes(cell[2])) {
      found.push({ term: cell[1], meaning: cell[2], kind: 'numeral' })
    }
  }
  return found
}

const numbers = readNumbers(resolve(PACKAGE_DIR, 'tune.csv'))

/**
 * Every number is kept, including the two that name the same value.
 * That is a clash in the source rather than a choice to make here, and
 * dropping one would quietly lose a four letter word.
 */
const numberByMeaning = new Map<string, Number>()
const clashes: Array<Number> = []
for (const item of numbers) {
  if (numberByMeaning.has(item.meaning)) {
    clashes.push(item)
  } else {
    numberByMeaning.set(item.meaning, item)
  }
  taken.add(item.term)
}

/** Reserve them, so no ordinary concept walks off with a numeral. */
for (const length of ATOM_LENGTHS) {
  free[length] = free[length].filter(t => !taken.has(t))
}

rule('NUMBERS')
line(`\n  ${numberByMeaning.size} numbers read from tune.csv`)
const numerals = [...numberByMeaning.values()].filter(n => n.kind === 'numeral')
const powers = [...numberByMeaning.values()].filter(n => n.kind === 'power')
line(`  ${numerals.length} numerals, ${powers.length} powers of ten`)

const wrongLength = [
  ...numerals.filter(n => n.term.length !== 3),
  ...powers.filter(n => n.term.length !== 4),
]
line(
  `  ${wrongLength.length} are the wrong length` +
    (wrongLength.length > 0
      ? `: ${wrongLength.map(n => `${n.term}=${n.meaning}`).join(' ')}`
      : ', numerals are three letters and powers are four'),
)

const gaps = NUMERALS.filter(n => !numberByMeaning.has(n))
if (gaps.length > 0) {
  line(`  ${gaps.length} numerals missing from tune.csv: ${gaps.join(' ')}`)
}
if (clashes.length > 0) {
  line(`  ${clashes.length} terms name a value another term already names:`)
  for (const item of clashes) {
    line(`    ${item.term} = ${item.meaning}, already ${numberByMeaning.get(item.meaning)!.term}`)
  }
}

// ─── Sounds ─────────────────────────────────────────────

/**
 * The names of the sounds themselves are already set in `tune.csv` and
 * they are kept exactly as they are. They are four letters, which
 * gives every phoneme a name a syllable longer than an ordinary root,
 * so talking about the language never collides with talking in it.
 */
function readCategory(path: string, want: string): Array<Number> {
  const found: Array<Number> = []
  for (const row of readFileSync(path, 'utf-8').split('\n').slice(1)) {
    const cell = row.split(',').map(c => c.trim())
    if (cell[0] !== want || !cell[1] || !cell[2]) {
      continue
    }
    found.push({ term: cell[1], meaning: cell[2], kind: 'numeral' })
  }
  return found
}

const sounds = readCategory(resolve(PACKAGE_DIR, 'tune.csv'), 'sound')
for (const item of sounds) {
  taken.add(item.term)
}

/**
 * Natural kinds stay atomic.
 *
 * A mushroom is not a kind of anything else. Neither is moss, or a
 * gill, or the colour red. These are the concepts a compound cannot
 * reach, so wherever `tune.csv` already marks one and the word is
 * short enough to be an atom, it is kept.
 *
 * The technical categories are deliberately left out. They are listed
 * in the run so the call is visible rather than assumed.
 */
const KIND_CATEGORIES = ['animal', 'plant', 'body', 'color']

const draftMeanings = new Set(draft.map(d => d.meaning))
const kinds: Array<Number> = []
const unsoundedKinds: Array<Number> = []
for (const name of KIND_CATEGORIES) {
  for (const item of readCategory(resolve(PACKAGE_DIR, 'tune.csv'), name)) {
    if (!ATOM_LENGTHS.includes(item.term.length) || taken.has(item.term)) {
      continue
    }
    /** The draft already speaks for this concept, so the category row
     * is the same atom said twice. */
    if (draftMeanings.has(item.meaning)) {
      continue
    }
    /** A natural kind is still a word, so it still has to be sayable.
     * Unlike the numbers and the sound names, these were not asked to
     * be kept letter for letter. */
    if (!testSounding(item.term).ok) {
      unsoundedKinds.push({ ...item, kind: name as never })
      continue
    }
    taken.add(item.term)
    kinds.push({ ...item, kind: name as never })
  }
}

/**
 * Some natural kinds carry no category in `tune.csv` at all: larva,
 * claw, feather, scale. `base/atom-keep.csv` is the hand list for
 * those, and for anything else that must stay atomic whatever the
 * categories say. Add to it rather than editing this file.
 */
const keepList: Array<Number> = []
for (const row of readFileSync(resolve(BASE_DIR, 'atom-keep.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cell = splitRow(row).map(c => c.trim())
  if (!cell[0] || taken.has(cell[0])) {
    continue
  }
  const meaning = tune.get(cell[0])
  if (!meaning) {
    continue
  }
  taken.add(cell[0])
  keepList.push({ term: cell[0], meaning, kind: 'keep' as never })
}
kinds.push(...keepList)

for (const length of ATOM_LENGTHS) {
  free[length] = free[length].filter(t => !taken.has(t))
}

rule('NATURAL KINDS')
line('')
for (const name of KIND_CATEGORIES) {
  const all = readCategory(resolve(PACKAGE_DIR, 'tune.csv'), name)
  const short = all.filter(i => ATOM_LENGTHS.includes(i.term.length))
  const added = kinds.filter(k => (k.kind as string) === name)
  line(
    `  ${name.padEnd(8)} ${String(all.length).padStart(3)} in tune.csv, ` +
      `${String(short.length).padStart(3)} short enough to be atoms, ` +
      `${String(added.length).padStart(3)} added here`,
  )
}
line(`  ${'by hand'.padEnd(8)} ${String(keepList.length).padStart(3)} from base/atom-keep.csv: ${keepList.map(k => k.term).join(' ')}`)
if (unsoundedKinds.length > 0) {
  line('')
  line(`  ${unsoundedKinds.length} broke a syllable rule and took a new word:`)
  for (const item of unsoundedKinds) {
    const swap = claim(item.term)
    line(`    ${item.term.padEnd(5)} -> ${swap.padEnd(5)} ${item.meaning}`)
    kinds.push({ term: swap, meaning: item.meaning, kind: item.kind })
  }
}
line('')
line('  Left out, because whether these are atoms is a call to make:')
for (const name of ['science', 'measurement', 'math', 'code']) {
  const all = readCategory(resolve(PACKAGE_DIR, 'tune.csv'), name)
  const short = all.filter(i => ATOM_LENGTHS.includes(i.term.length))
  line(`    ${name.padEnd(12)} ${String(short.length).padStart(3)} short terms`)
}

rule('SOUND NAMES')
line(`\n  ${sounds.length} sound names read from tune.csv, all kept as they are`)
const soundLengths: Record<number, number> = {}
for (const item of sounds) {
  soundLengths[item.term.length] = (soundLengths[item.term.length] ?? 0) + 1
}
for (const length of Object.keys(soundLengths).map(Number).sort()) {
  line(`  ${soundLengths[length]} of ${length} letters`)
}
const shortSounds = sounds.filter(s => s.term.length !== 4)
if (shortSounds.length > 0) {
  line(
    `  ${shortSounds.length} are three letters and stay that way: ` +
      shortSounds.map(s => `${s.term}=${s.meaning}`).join(', '),
  )
  line('  they name the idea rather than a particular sound, so they')
  line('  belong with the ordinary roots on length')
}
const unsoundedSounds = sounds.filter(s => !testSounding(s.term).ok)
line(
  unsoundedSounds.length === 0
    ? '  every one obeys the syllable rules'
    : `  ${unsoundedSounds.length} break a syllable rule and are kept anyway: ${unsoundedSounds.map(s => s.term).join(' ')}`,
)

// ─── Assignment ─────────────────────────────────────────

type Atom = Draft & {
  atom: string
  state:
    | 'held'
    | 'shortened'
    | 'resounded'
    | 'filled'
    | 'stuck'
    | 'number'
    | 'sound'
    | 'kind'
  was: string
}

/** Take the best free term of the shortest length that has one. */
function claim(want: string): string {
  for (const length of ATOM_LENGTHS) {
    const pool = free[length]
    if (pool.length === 0) {
      continue
    }
    if (!want) {
      /** Nothing to sound like, so take the next one in order. */
      return pool.shift()!
    }
    let bestAt = 0
    let bestScore = -Infinity
    for (let i = 0; i < pool.length; i++) {
      const value = score(pool[i], want)
      if (value > bestScore) {
        bestScore = value
        bestAt = i
      }
    }
    return pool.splice(bestAt, 1)[0]
  }
  return ''
}

/**
 * What a concept with no term of its own should sound like.
 *
 * The draft is ordered by meaning, not alphabetically: `more` and
 * `less` sit together, so do `inside` and `outside`, `above` and
 * `below`, `son` and `daughter`. So the neighbour in the list is
 * almost always the concept a missing one belongs beside, and a term
 * close to the neighbour's gives a lexicon where related ideas sound
 * related.
 *
 * Without this every gap takes whatever is alphabetically first, which
 * put twenty five unrelated concepts on `b-`.
 */
function anchorFor(index: number, list: Array<Draft>): string {
  const self = list[index]
  for (let step = 1; step < list.length; step++) {
    for (const at of [index - step, index + step]) {
      const other = list[at]
      if (!other || other.category !== self.category) {
        continue
      }
      if (other.term && ATOM_LENGTHS.includes(other.term.length)) {
        return other.term
      }
    }
  }
  return ''
}

const atoms: Array<Atom> = []

/**
 * Held first, so the short terms already in the right place stay put
 * before anything else is handed out. A term that breaks a syllable
 * rule is not in the right place, however short it is, so it goes back
 * in the queue to be swapped.
 */
const unsounded = new Set<string>()
for (const item of draft) {
  if (item.term && ATOM_LENGTHS.includes(item.term.length)) {
    if (testSounding(item.term).ok) {
      atoms.push({ ...item, atom: item.term, state: 'held', was: '' })
    } else {
      unsounded.add(item.meaning)
      taken.delete(item.term)
    }
  }
}

for (let i = 0; i < draft.length; i++) {
  const item = draft[i]
  if (
    item.term &&
    ATOM_LENGTHS.includes(item.term.length) &&
    !unsounded.has(item.meaning)
  ) {
    continue
  }
  /** A concept with a long term sounds like that term. One with no
   * term at all sounds like the concept it sits beside. */
  const want = item.term || anchorFor(i, draft)
  const atom = claim(want)
  atoms.push({
    ...item,
    atom,
    state:
      atom === ''
        ? 'stuck'
        : unsounded.has(item.meaning)
          ? 'resounded'
          : item.term
            ? 'shortened'
            : 'filled',
    was: item.term,
  })
}

/** Back into the draft's own order, which runs domain by domain. */
const order = new Map(draft.map((d, i) => [d.meaning, i]))
atoms.sort((a, b) => (order.get(a.meaning) ?? 0) - (order.get(b.meaning) ?? 0))

/**
 * The numbers go on the end, counting up. A numeral the lexicon does
 * not have takes a free three letter term close to the numeral before
 * it, so the count sounds like a count.
 */
const numberAtoms: Array<Atom> = []
let lastNumeral = ''
for (const meaning of NUMERALS) {
  const held = numberByMeaning.get(meaning)
  if (held) {
    lastNumeral = held.term
    numberAtoms.push({
      category: 'number',
      term: held.term,
      meaning,
      source: '',
      status: '',
      language: '',
      atom: held.term,
      state: 'number',
      was: '',
    })
    continue
  }
  const atom = claim(lastNumeral)
  numberAtoms.push({
    category: 'number',
    term: '',
    meaning,
    source: '',
    status: '',
    language: '',
    atom,
    state: 'filled',
    was: '',
  })
}
const allPowers = [...powers, ...clashes.filter(c => c.kind === 'power')]
for (const item of allPowers.sort((a, b) =>
  a.meaning.length === b.meaning.length
    ? a.meaning.localeCompare(b.meaning)
    : a.meaning.length - b.meaning.length,
)) {
  numberAtoms.push({
    category: 'number',
    term: item.term,
    meaning: item.meaning,
    source: '',
    status: '',
    language: '',
    atom: item.term,
    state: 'number',
    was: '',
  })
}
/**
 * A few concepts sit in the draft and in a pinned block at once: the
 * draft asks for `one` and so does the numeral list, and both land on
 * `zan`. They are the same atom, so the pinned row wins and the draft
 * row goes, which keeps the numerals together at the end.
 */
const pinned = new Set([
  ...numberAtoms.map(a => a.atom),
  ...sounds.map(s => s.term),
  ...kinds.map(k => k.term),
])
for (let i = atoms.length - 1; i >= 0; i--) {
  if (pinned.has(atoms[i].atom)) {
    atoms.splice(i, 1)
  }
}

atoms.push(...numberAtoms)

/** The natural kinds, kept with the meaning they already had. */
for (const item of kinds) {
  atoms.push({
    category: item.kind as string,
    term: item.term,
    meaning: item.meaning,
    source: '',
    status: '',
    language: '',
    atom: item.term,
    state: 'kind',
    was: '',
  })
}

/** The sound names, kept exactly as they are. */
for (const item of sounds) {
  atoms.push({
    category: 'sound',
    term: item.term,
    meaning: item.meaning,
    source: '',
    status: '',
    language: '',
    atom: item.term,
    state: 'sound',
    was: '',
  })
}

// ─── Out ────────────────────────────────────────────────

const rows: Array<string> = ['atom,meaning,state,was,displaced']
for (const item of atoms) {
  /** Only a word that changed hands displaced anything. A held, a
   * numeral and a sound name all kept their own meaning. */
  const settled = ['held', 'number', 'sound', 'kind'].includes(item.state)
  const before = tune.get(item.atom) ?? ''
  const displaced = settled || before === item.meaning ? '' : before
  rows.push(
    [item.atom, item.meaning, item.state, item.was, displaced]
      .map(c => (c.includes(',') ? `"${c}"` : c))
      .join(','),
  )
}

const outPath = resolve(PACKAGE_DIR, 'tune.3.csv')
writeFileSync(outPath, rows.join('\n') + '\n')

const state: Record<string, number> = {}
const byLength: Record<number, number> = {}
for (const item of atoms) {
  state[item.state] = (state[item.state] ?? 0) + 1
  byLength[item.atom.length] = (byLength[item.atom.length] ?? 0) + 1
}

rule('ATOMS')
line('')
for (const name of ['held', 'shortened', 'resounded', 'filled', 'number', 'sound', 'kind', 'stuck']) {
  line(`  ${name.padEnd(11)} ${String(state[name] ?? 0).padStart(4)}`)
}
line('')
for (const length of Object.keys(byLength).map(Number).sort()) {
  line(`  ${length} letters  ${String(byLength[length]).padStart(4)}`)
}

rule('BY DOMAIN')
line('')
const domains = new Map<string, Array<Atom>>()
for (const item of atoms) {
  domains.set(item.category, [...(domains.get(item.category) ?? []), item])
}
for (const [name, list] of domains) {
  const three = list.filter(a => a.atom.length === 3).length
  line(
    `  ${name.padEnd(24)} ${String(list.length).padStart(3)}  ` +
      `(${three} of three letters)  ${list.slice(0, 5).map(a => `${a.atom}=${a.meaning}`).join(' ')}`,
  )
}

rule('SHORTENED')
line('\n  Concepts that gave up a longer term for a short one.\n')
for (const item of atoms.filter(a => a.state === 'shortened').slice(0, 25)) {
  line(`    ${item.was.padEnd(9)} -> ${item.atom.padEnd(5)} ${item.meaning}`)
}

rule('FILLED')
line('\n  Concepts the draft had no term for. Each took a term close to')
line('  the concept it sits beside in the list, so pairs sound like')
line('  pairs. These are the ones to look over by hand.\n')
const order2 = new Map(draft.map((d, i) => [d.meaning, i]))
for (const item of atoms.filter(a => a.state === 'filled').slice(0, 30)) {
  const at = order2.get(item.meaning) ?? 0
  const anchor = anchorFor(at, draft)
  const beside = draft.find(
    d => d.term === anchor && ATOM_LENGTHS.includes(d.term.length),
  )
  line(
    `    ${item.atom.padEnd(5)} ${item.meaning.padEnd(14)} beside ${anchor.padEnd(5)} ${beside ? beside.meaning : ''}`,
  )
}

rule('DISPLACED')
const displaced = atoms.filter(
  a => a.state !== 'held' && tune.get(a.atom) && tune.get(a.atom) !== a.meaning,
)
line(`\n  ${displaced.length} short terms carried a different meaning in tune.tsv`)
line('  and now carry an atom instead. The old meaning is not lost, it')
line('  just stops being atomic and gets built from other roots.\n')
for (const item of displaced.slice(0, 20)) {
  line(`    ${item.atom.padEnd(5)} ${String(tune.get(item.atom)).padEnd(28)} -> ${item.meaning}`)
}

// ─── What Was Dropped ───────────────────────────────────

/**
 * Every one syllable term in the lexicon is either an atom or it is
 * not. The ones that are not are concepts that can be built out of
 * other atoms, so they give up their short word.
 *
 * Some of those words are taken straight back up by a concept that
 * needed one. The rest are simply free.
 */
const kept = new Set(atoms.map(a => a.atom))
const reused = new Map<string, string>()
for (const item of atoms) {
  if (item.state === 'shortened' || item.state === 'resounded' || item.state === 'filled') {
    const before = tune.get(item.atom)
    if (before && before !== item.meaning) {
      reused.set(item.atom, item.meaning)
    }
  }
}

const dropped: Array<{ term: string; meaning: string; fate: string; became: string }> = []
for (const [term, meaning] of tune) {
  if (!ATOM_LENGTHS.includes(term.length)) {
    continue
  }
  if (reused.has(term)) {
    dropped.push({ term, meaning, fate: 'reused', became: reused.get(term)! })
    continue
  }
  if (!kept.has(term)) {
    dropped.push({ term, meaning, fate: 'removed', became: '' })
  }
}

dropped.sort((a, b) => a.term.length - b.term.length || a.term.localeCompare(b.term))

const droppedRows = ['term,meaning,fate,became']
for (const item of dropped) {
  droppedRows.push(
    [item.term, item.meaning, item.fate, item.became]
      .map(c => (c.includes(',') ? `"${c}"` : c))
      .join(','),
  )
}
const droppedPath = resolve(BASE_DIR, 'atom-removed.csv')
writeFileSync(droppedPath, droppedRows.join('\n') + '\n')

rule('DROPPED FROM ONE SYLLABLE')
const shortTotal = [...tune.keys()].filter(t => ATOM_LENGTHS.includes(t.length)).length
const removedOnly = dropped.filter(d => d.fate === 'removed')
const reusedOnly = dropped.filter(d => d.fate === 'reused')
line(`\n  ${shortTotal.toLocaleString()} one syllable terms in the lexicon`)
line(`  ${(shortTotal - dropped.length).toLocaleString()} kept their meaning and are atoms`)
line(`  ${reusedOnly.length.toLocaleString()} gave their word to a concept that needed one`)
line(`  ${removedOnly.length.toLocaleString()} are simply free`)
line('')
line('  A dropped meaning is not lost. It stops being atomic and gets')
line('  built from other atoms, which is the whole point: `waterfall`')
line('  does not need a root when `water` and `fall` have one.')
line('')
line('  gave their word away:')
for (const item of reusedOnly.slice(0, 14)) {
  line(`    ${item.term.padEnd(5)} ${item.meaning.padEnd(26)} -> ${item.became}`)
}
line('')
line('  simply free:')
line(`    ${removedOnly.slice(0, 24).map(d => d.term).join(' ')}`)

/**
 * The draft is written back with every term short, so it holds only
 * three and four letter words. Running this again finds them already
 * in place and holds them, which makes the build settle rather than
 * shuffle.
 */
const draftRows = ['category,term,meaning,source_meaning,status,language']
for (const item of atoms) {
  if (
    ['number', 'sound', 'animal', 'plant', 'body', 'color', 'keep'].includes(
      item.category,
    )
  ) {
    continue
  }
  draftRows.push(
    [
      item.category,
      item.atom,
      item.meaning,
      item.source,
      item.state,
      item.language,
    ]
      .map(c => ((c ?? '').includes(',') ? `"${c}"` : (c ?? '')))
      .join(','),
  )
}
const draftPath = resolve(BASE_DIR, 'atom-draft.csv')
writeFileSync(draftPath, draftRows.join('\n') + '\n')

rule('OUT')
line(`\n  ${rows.length - 1} atoms -> ${outPath}`)
line(`  ${draftRows.length - 1} concepts -> ${draftPath}, all three or four letters`)
line(`  ${dropped.length} dropped -> ${droppedPath}`)
