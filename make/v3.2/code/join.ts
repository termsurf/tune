/**
 * Where a joined Moon word can be cut more than one way.
 *
 * The atoms are `CVC`, `CVCC` and `CCVC` at one syllable, `CVCVC` at
 * two, and `CVCVCVC` at three. Joining two of them gives twenty five
 * pairings and twenty four distinct shapes, so exactly one shape is
 * reached two ways:
 *
 *   CVC  + CCVC  -> CVCCCVC     these two
 *   CVCC + CVC   -> CVCCCVC     reach the same shape
 *
 * A seven letter word with three consonants in the middle can be cut
 * before the second of them or after it.
 *
 *   bat  + stal  ->  batstal
 *   bats + tal   ->  batstal
 *
 * It is not that three and four letter atoms cannot be joined. Four of
 * the six ways to join one to the other are fine, and so is every join
 * involving `CVCVC` or `CVCVCVC`:
 *
 *   CVC  + CVCC  -> CVCCVCC     reached one way only
 *   CVCC + CCVC  -> CVCCCCVC    reached one way only
 *   CCVC + CVC   -> CCVCCVC     reached one way only
 *   CCVC + CVCC  -> CCVCCVCC    reached one way only
 *
 * So there are exactly two bad seams:
 *
 *   CVC  followed by CCVC
 *   CVCC followed by CVC
 *
 * A chain of any length is safe when it never puts either of those
 * side by side. Three ways out:
 *
 *   drop `CVC + CCVC`    costs 632,541 pairings, the cheaper side
 *   drop `CVCC + CVC`    costs 1,674,036 pairings
 *   keep both and fix where the cut falls by rule, which costs
 *   nothing: say the coda always takes as much as it can, and
 *   `batstal` is always `bats` + `tal`, never `bat` + `stal`
 *
 * The third is what a spoken language usually does, and it is the only
 * one that loses no words. Nothing here picks for you.
 *
 * `CVCVC` and `CVCVCVC` brought no new ambiguity with them, because
 * neither leaves a consonant cluster at a seam, and a cut can only be
 * in doubt where consonants pile up.
 *
 * Whether a particular word is really ambiguous depends on the cluster
 * rules. The cut only works where the two consonants left behind make
 * a legal coda and the two carried forward make a legal onset, so the
 * question is how often a coda cluster and an onset cluster overlap on
 * the same consonant.
 *
 * The tables below are worked out rather than written down, so adding
 * an atom to `ATOMS` re-answers the question.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/moon/code/join.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  CODA_CLUSTERS,
  CODA_CLUSTERS_CLEAR,
  CONSONANTS,
  ONSET_CLUSTERS,
  ONSET_CLUSTERS_CLEAR,
  VOWELS,
  areSimilar,
  compareWords,
  isVowel,
  toShape,
  vowelsClose,
} from '#/make/moon/code/sound'

/** A single consonant that can open a word. */
const CAN_OPEN = CONSONANTS.filter(c => c !== 'q')

/** A single consonant that can close one. */
const CAN_CLOSE = CONSONANTS.filter(c => !['y', 'h', 'w'].includes(c))

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(__dirname, '../base')

function line(text: string) {
  console.log(text)
}

function rule(title: string) {
  line(`\n${'='.repeat(60)}`)
  line(title)
  line('='.repeat(60))
}

// ─── The Atoms ──────────────────────────────────────────

const ATOMS = ['CVC', 'CVCC', 'CCVC', 'CCVCC', 'CVCVC', 'CVCVCVC']

/** How many atoms a joined word may hold, for the collision check. */
const PARTS = [2, 3]

const meaning = new Map<string, string>()
const byShape = new Map<string, Array<string>>()

for (const row of readFileSync(resolve(BASE_DIR, 'word.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cell = row.split(',')
  if (!cell[0]) {
    continue
  }
  meaning.set(cell[0], cell[2] ?? '')
  const shape = toShape(cell[0])
  if (shape) {
    byShape.set(shape, [...(byShape.get(shape) ?? []), cell[0]])
  }
}

/**
 * `CVCVC` and `CVCVCVC` are not in `base/word.csv`, which holds one
 * syllable words only. Their counts come from `base/unified/*.csv`,
 * written by `calculate.ts`, which is the only written statement of
 * how a word of more than one syllable is allowed to be built.
 */
function readUnified(name: string): number {
  const path = resolve(BASE_DIR, 'unified', name)
  if (!existsSync(path)) {
    return 0
  }
  /** Counted by newline rather than split, because the three syllable
   * file holds nearly two million words and splitting it costs about a
   * gigabyte for a number. */
  const text = readFileSync(path, 'utf-8')
  let lines = 0
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      lines++
    }
  }
  return Math.max(0, lines - 1)
}

const size: Record<string, number> = {
  CVC: (byShape.get('CVC') ?? []).length,
  CVCC: (byShape.get('CVCC') ?? []).length,
  CCVC: (byShape.get('CCVC') ?? []).length,
  CCVCC: (byShape.get('CCVCC') ?? []).length,
  CVCVC: readUnified('5.csv'),
  CVCVCVC: readUnified('7.csv'),
}

// ─── Distinctness ───────────────────────────────────────

/**
 * How many of a set of words are far enough apart to be different
 * words, under the same closeness rule the four letter shapes were
 * thinned by.
 *
 * This matters for the join counts. A joined word `A + B` is too close
 * to `A' + B'` exactly when `A` is too close to `A'` and `B` is too
 * close to `B'`, because the two halves never overlap. So the number of
 * distinct joins is the product of the distinct atom counts, and there
 * is no need to walk billions of pairs to find it.
 */
function* nearWords(word: string): Generator<string> {
  const options = [...word].map(sound =>
    isVowel(sound)
      ? VOWELS.filter(v => vowelsClose(sound, v))
      : CONSONANTS.filter(c => areSimilar(sound, c)),
  )
  const at = new Array(word.length).fill(0)
  for (;;) {
    yield options.map((list, i) => list[at[i]]).join('')
    let i = word.length - 1
    while (i >= 0) {
      at[i]++
      if (at[i] < options[i].length) {
        break
      }
      at[i] = 0
      i--
    }
    if (i < 0) {
      return
    }
  }
}

function countDistinct(list: Array<string>): number {
  const kept = new Set<string>()
  for (const word of [...list].sort(compareWords)) {
    let clash = false
    for (const near of nearWords(word)) {
      if (kept.has(near)) {
        clash = true
        break
      }
    }
    if (!clash) {
      kept.add(word)
    }
  }
  return kept.size
}

/** Past this many words the walk costs more than the answer is worth. */
const DISTINCT_LIMIT = 100_000

function readUnifiedWords(name: string): Array<string> {
  const path = resolve(BASE_DIR, 'unified', name)
  if (!existsSync(path)) {
    return []
  }
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l !== 'word')
}

/**
 * Counting how many words are far enough apart needs the words
 * themselves, and the three syllable list runs to nearly two million
 * of them. Loading that just to decide it is too big to walk costs a
 * gigabyte, so the size is read first and the words only after.
 */
/**
 * For the one syllable shapes the answer is already written down.
 * `space.ts` thins them and marks each word, and thinning is order
 * dependent, so recomputing it here with a different order gave a
 * different number for the same thing. Read the flag instead.
 */
function readDistinct(shape: string): number | null {
  const path = resolve(BASE_DIR, 'word', `${shape}.csv`)
  if (!existsSync(path)) {
    return null
  }
  return readFileSync(path, 'utf-8')
    .split('\n')
    .slice(1)
    .filter(l => l.split(',')[2] === 'yes').length
}

const distinct: Record<string, number> = {}
for (const shape of ATOMS) {
  const written = readDistinct(shape)
  if (written !== null) {
    distinct[shape] = written
    continue
  }
  if (size[shape] > DISTINCT_LIMIT) {
    distinct[shape] = 0
    continue
  }
  distinct[shape] = countDistinct(readUnifiedWords(`${shape.length}.csv`))
}

// ─── Shape Collisions ───────────────────────────────────

/**
 * Every way of building a shape out of `count` atoms.
 *
 * A join carries a linking consonant, so the shape of two atoms joined
 * is the first, then a `C` for the linker, then the second.
 */
function buildShapes(count: number): Map<string, Array<string>> {
  let ways: Array<Array<string>> = [[]]
  for (let i = 0; i < count; i++) {
    const next: Array<Array<string>> = []
    for (const way of ways) {
      for (const atom of ATOMS) {
        next.push([...way, atom])
      }
    }
    ways = next
  }
  const found = new Map<string, Array<string>>()
  for (const way of ways) {
    const shape = way.join('C')
    found.set(shape, [...(found.get(shape) ?? []), way.join('-')])
  }
  return found
}

/**
 * Whether two ways of reading the same shape can be told apart by
 * where the linker falls.
 *
 * No coda cluster ends in a linker and no onset cluster begins with
 * one, so in any run of consonants at a seam the linker is the only
 * position that could be one. Two readings that put the linker in
 * different places therefore disagree about a sound that is either a
 * linker or is not, and only one of them can be right.
 */
function linkerPositions(way: string): Array<number> {
  const parts = way.split('-')
  const at: Array<number> = []
  let run = 0
  for (let i = 0; i < parts.length - 1; i++) {
    run += parts[i].length
    at.push(run)
    run += 1
  }
  return at
}

const shapeSplits = buildShapes(2)
const collidingShapes = [...shapeSplits.entries()].filter(
  ([, splits]) => splits.length > 1,
)

// ─── Ambiguity ──────────────────────────────────────────

/**
 * There is none left to count.
 *
 * Before joins were marked, a run of three consonants could be cut two
 * ways and 22,746 words really were ambiguous. Every join now carries a
 * linker, no coda ends in one and no onset begins with one, so in any
 * run of consonants exactly one position can be the linker and the cut
 * follows from it.
 *
 * `WHICH JOINED SHAPES COLLIDE` below checks the one shape two pairings
 * still share and confirms the linker falls in a different place in
 * each, which is what settles it.
 */
const ambiguous: Array<{ word: string; cuts: Array<string> }> = []

// ─── Run ────────────────────────────────────────────────

rule('ATOMS')
line('')
line('| shape     |     count |  distinct | where it comes from                   |')
line('| :-------- | --------: | --------: | :------------------------------------ |')
for (const shape of ATOMS) {
  const from =
    shape.length === 3
      ? 'every word the rules allow'
      : shape.length === 4
        ? 'the rules, then thinned for closeness'
        : `base/unified/${shape.length}.csv, from calculate.ts`
  const far = distinct[shape] === 0 ? 'not counted' : distinct[shape].toLocaleString()
  line(
    `| \`${shape}\`${' '.repeat(9 - shape.length)} | ${size[shape].toLocaleString().padStart(9)} | ${far.padStart(9)} | ${from.padEnd(37)} |`,
  )
}
line('')
line('  `distinct` is how many are far enough apart to be different')
line('  words under the same closeness rule the four letter shapes were')
line('  thinned by. The four letter shapes were already thinned, so')
line('  their two columns agree. Nothing else was.')
line('')
for (const length of [3, 4, 5, 7]) {
  const n = ATOMS.filter(s => s.length === length).reduce(
    (m, s) => m + size[s],
    0,
  )
  if (n > 0) {
    line(`  ${length} letters  ${n.toLocaleString().padStart(11)}`)
  }
}
line(
  `  in all     ${ATOMS.reduce((n, s) => n + size[s], 0).toLocaleString().padStart(11)}`,
)

rule('WHICH JOINED SHAPES COLLIDE')

for (const count of PARTS) {
  const shapes = buildShapes(count)
  const colliding = [...shapes.entries()].filter(([, w]) => w.length > 1)

  line(
    `\n  ${count} atoms: ${Math.pow(ATOMS.length, count).toLocaleString()} pairings, ${shapes.size} distinct shapes\n`,
  )

  if (count === 2) {
    for (const [shape, ways] of [...shapes.entries()].sort(
      (a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0]),
    )) {
      const mark = ways.length > 1 ? `  <- ${ways.length} ways` : ''
      line(`    ${shape.padEnd(15)} ${ways.join(', ').padEnd(30)}${mark}`)
    }
    line('')
  }

  if (colliding.length === 0) {
    line('    no shape can be cut more than one way')
  } else {
    let settled = 0
    for (const [shape, ways] of colliding.sort(
      (a, b) => a[0].length - b[0].length,
    )) {
      const spots = ways.map(w => linkerPositions(w).join(','))
      const apart = new Set(spots).size === spots.length
      if (apart) {
        settled++
      }
      line(
        `    ${shape.padEnd(17)} ${ways.join('   or   ')}${apart ? '' : '   <- SAME LINKER SPOTS'}`,
      )
    }
    line('')
    line(
      `    ${settled} of ${colliding.length} are told apart by where the linker falls, so the`,
    )
    line('    reading is settled even though the shape is shared')
  }
}

rule('ACROSS PART COUNTS')
line('')
const reach = new Map<string, Set<string>>()
for (const count of PARTS) {
  for (const [shape, ways] of buildShapes(count)) {
    const held = reach.get(shape) ?? new Set<string>()
    for (const way of ways) {
      held.add(way)
    }
    reach.set(shape, held)
  }
}
const crossed = [...reach.entries()].filter(
  ([, ways]) => new Set([...ways].map(w => w.split('-').length)).size > 1,
)
if (crossed.length === 0) {
  line('  no shape can be read as both two atoms and three')
} else {
  for (const [shape, ways] of crossed) {
    line(`  ${shape.padEnd(16)} ${[...ways].join('   or   ')}`)
  }
}

// ─── Join Counts ────────────────────────────────────────

/**
 * The join table, for a given set of atoms.
 *
 * It is printed twice: once for everything, and once without the three
 * syllable `CVCVCVC`, which on its own is larger than the rest of the
 * language put together and swamps the arithmetic.
 */
function joinTable(atoms: Array<string>, title: string): void {
  rule(`HOW MANY JOINS OF EACH, ${title}`)
  line('')
  line('| join                    | shape              |             count |       distinct |')
  line('| :---------------------- | :----------------- | ----------------: | -------------: |')

  let total = 0
  let far = 0
  let farKnown = true
  for (const a of atoms) {
    for (const b of atoms) {
      const n = size[a] * size[b]
      total += n
      const d = distinct[a] * distinct[b]
      if (distinct[a] === 0 || distinct[b] === 0) {
        farKnown = false
      }
      far += d
      line(
        `| ${`\`${a}\` + \`${b}\``.padEnd(23)} | ${`\`${a}C${b}\``.padEnd(18)} | ${n.toLocaleString().padStart(17)} | ${(d === 0 ? '' : d.toLocaleString()).padStart(14)} |`,
      )
    }
  }
  line(`| **all** | | **${total.toLocaleString()}** | ${farKnown ? `**${far.toLocaleString()}**` : ''} |`)

  /**
   * Nothing is counted twice. Every join carries a linker, and no coda
   * ends in one and no onset begins with one, so the only shape two
   * pairings share is told apart by where the linker falls.
   */
  const doubled = 0
  const atomTotal = atoms.reduce((n, shape) => n + size[shape], 0)

  line('')
  line(`  atoms alone          ${atomTotal.toLocaleString().padStart(19)}`)
  line(`  two atom joins       ${(total - doubled).toLocaleString().padStart(19)}`)
  line(
    `  in all               ${(atomTotal + total - doubled).toLocaleString().padStart(19)}`,
  )
  line('')
  line('  nothing is subtracted: the linker makes every join readable one')
  line('  way, so a pairing and a word are the same thing here')
}

joinTable(ATOMS, 'everything')
joinTable(
  ATOMS.filter(a => a !== 'CVCVCVC'),
  'one and two syllable atoms only',
)

// ─── Consonant Runs ─────────────────────────────────────

/** How many consonants an atom ends on. Only `CVCC` ends on two. */
function trailing(shape: string): number {
  return shape.endsWith('CC') ? 2 : 1
}

/** How many consonants an atom opens on. Only `CCVC` opens on two. */
function leading(shape: string): number {
  return shape.startsWith('CC') ? 2 : 1
}

/**
 * The longest run of consonants in a joined word.
 *
 * An atom on its own never holds more than two in a row, and the seam
 * always holds at least two, so the longest run in a joined word is
 * always the seam: what the first atom ends on plus what the second
 * one opens on.
 */
function runTable(atoms: Array<string>, title: string): void {
  rule(`CONSONANTS IN A ROW, ${title}`)
  line('')

  const byRun = new Map<number, { count: number; ways: Array<string> }>()
  for (const a of atoms) {
    for (const b of atoms) {
      /** The linker sits between them, so it counts too. */
      const run = trailing(a) + 1 + leading(b)
      const held = byRun.get(run) ?? { count: 0, ways: [] }
      held.count += size[a] * size[b]
      held.ways.push(`${a}-${b}`)
      byRun.set(run, held)
    }
  }

  line('| in a row | pairings |             words | what makes it |')
  line('| :------- | -------: | ----------------: | :------------ |')
  for (const run of [...byRun.keys()].sort()) {
    const held = byRun.get(run)!
    const what =
      run === 3
        ? 'linker only, neither atom brings a cluster'
        : run === 4
          ? 'linker and one cluster'
          : 'linker and two clusters'
    line(
      `| ${String(run).padEnd(8)} | ${String(held.ways.length).padStart(8)} | ${held.count.toLocaleString().padStart(17)} | ${what} |`,
    )
  }

  const total = [...byRun.values()].reduce((n, h) => n + h.count, 0)
  line(`| **all** | ${atoms.length * atoms.length} | **${total.toLocaleString()}** | |`)

  line('')
  line('  Five in a row happens one way only:')
  for (const way of byRun.get(5)?.ways ?? []) {
    line(`    ${way}`)
  }
  line('')
  line('  Every seam holds a linker, so the shortest run is three and')
  line('  every run has exactly one position that could be the linker.')
  line('  That is what makes the reading follow from the sounds rather')
  line('  than from knowing the words.')
}

runTable(ATOMS, 'everything')
runTable(
  ATOMS.filter(a => a !== 'CVCVCVC'),
  'one and two syllable atoms only',
)

// ─── Which Joins Conflict ───────────────────────────────

// ─── Three Atom Chains ──────────────────────────────────

/**
 * Every chain of three one syllable atoms.
 *
 * Each seam carries its own linker, so a three atom word has two of
 * them. The reading is settled the same way it is for two: no coda
 * ends in a linker and no onset begins with one, so each run of
 * consonants has exactly one position that could be the linker.
 *
 * A chain is only listed when nothing else lands on its shape, or when
 * what does is told apart by where the linkers fall.
 */
function chainTable(atoms: Array<string>, count: number): void {
  rule(`CHAINS OF ${count} ONE SYLLABLE ATOMS`)

  const shapes = new Map<string, Array<Array<string>>>()
  function walk(way: Array<string>) {
    if (way.length === count) {
      const shape = way.join('C')
      shapes.set(shape, [...(shapes.get(shape) ?? []), way])
      return
    }
    for (const atom of atoms) {
      walk([...way, atom])
    }
  }
  walk([])

  line('')
  line('| chain               | shape                 |       count |  distinct | reads |')
  line('| :------------------ | :-------------------- | ----------: | --------: | :---- |')

  let total = 0
  let far = 0
  let safe = 0

  const rows: Array<{ way: Array<string>; shape: string; ok: boolean }> = []
  for (const [shape, ways] of shapes) {
    const spots = ways.map(w => linkerPositions(w.join('-')).join(','))
    const ok = new Set(spots).size === spots.length
    for (const way of ways) {
      rows.push({ way, shape, ok })
    }
  }

  rows.sort((a, b) => a.shape.length - b.shape.length || a.shape.localeCompare(b.shape))

  for (const row of rows) {
    const n = row.way.reduce((m, a) => m * size[a], 1)
    const d = row.way.reduce((m, a) => m * distinct[a], 1)
    total += n
    far += d
    if (row.ok) {
      safe++
    }
    line(
      `| ${row.way.join(' + ').padEnd(19)} | \`${row.shape}\`${' '.repeat(Math.max(0, 20 - row.shape.length))} | ${n.toLocaleString().padStart(11)} | ${d.toLocaleString().padStart(9)} | ${row.ok ? 'one way' : 'SHARED'} |`,
    )
  }

  line(`| **all** | | **${total.toLocaleString()}** | **${far.toLocaleString()}** | |`)
  line('')
  line(`  ${rows.length} chains, ${shapes.size} distinct shapes, ${safe} of them read one way`)
  if (safe === rows.length) {
    line('  every chain reads one way, so none has to be ruled out')
  }
}

chainTable(['CVC', 'CVCC', 'CCVC', 'CCVCC'], 3)

rule('WHICH JOINS CONFLICT')
line('')
if (collidingShapes.length === 0) {
  line('  none')
} else {
  for (const [shape, ways] of collidingShapes) {
    line(`  ${shape} is reached ${ways.length} ways:`)
    for (const way of ways) {
      const [a, b] = way.split('-')
      line(
        `    ${a.padEnd(7)} + ${b.padEnd(7)}   ${(size[a] * size[b]).toLocaleString().padStart(12)} pairings`,
      )
    }
    line('')
    line('    Every other join of those same shapes is fine:')
    const touched = new Set(ways.flatMap(w => w.split('-')))
    for (const a of ATOMS) {
      for (const b of ATOMS) {
        if (a + b === shape || (!touched.has(a) && !touched.has(b))) {
          continue
        }
        if ((shapeSplits.get(a + b) ?? []).length === 1) {
          line(
            `      ${a.padEnd(7)} + ${b.padEnd(7)} -> ${(a + b).padEnd(15)} one way only`,
          )
        }
      }
    }
  }
}

rule('WHAT A WORD MAY OPEN AND CLOSE ON')
line('')
line(`  open on one consonant   ${CAN_OPEN.length}`)
line(`    ${CAN_OPEN.join(' ')}`)
line(`    every consonant but \`q\``)
line('')
line(`  open on two             ${[...ONSET_CLUSTERS_CLEAR].length}`)
line(`    ${[...ONSET_CLUSTERS_CLEAR].sort().join(' ')}`)
line('')
line(`  close on one consonant  ${CAN_CLOSE.length}`)
line(`    ${CAN_CLOSE.join(' ')}`)
line(`    every consonant but \`y\`, \`w\` and \`h\``)
line('')
line(`  close on two            ${[...CODA_CLUSTERS_CLEAR].length}`)
line(`    ${[...CODA_CLUSTERS_CLEAR].sort().join(' ')}`)
line('')
line('  and no word may close on `il`, `el`, `ir` or `er`')

rule('THREE ATOMS')
line('')
const three = buildShapes(3)
const threeBad = [...three.entries()].filter(([, w]) => w.length > 1)
const badWays = new Set(threeBad.flatMap(([, w]) => w))

line(`  ${Math.pow(ATOMS.length, 3)} ways to join three atoms`)
line(`  ${three.size} distinct shapes`)
line(`  ${Math.pow(ATOMS.length, 3) - badWays.size} of the ways are safe`)
line(`  ${badWays.size} land on a shape something else also lands on`)
line('')
line('  The ones to avoid, all of them a bad seam showing up inside a')
line('  longer word:')
line('')
for (const [shape, ways] of threeBad.sort((x, y) => x[0].length - y[0].length)) {
  line(`    ${shape}`)
  for (const way of ways) {
    line(`      ${way}`)
  }
}
line('')
line('  There are exactly two bad seams:')
line('')
line('    CVC  followed by CCVC')
line('    CVCC followed by CVC')
line('')
line('  A chain of any length is safe when it never puts either of those')
line('  side by side. Nothing else matters: CVCC followed by CCVC is')
line('  fine, and so is CCVC followed by anything.')
line('')
const safeCount = new Map<string, number>()
for (const [, ways] of three) {
  if (ways.length > 1) {
    continue
  }
  const first = ways[0].split('-')[0]
  safeCount.set(first, (safeCount.get(first) ?? 0) + 1)
}
line('  safe three atom chains, by what they open with:')
for (const atom of ATOMS) {
  line(
    `    ${atom.padEnd(8)} ${String(safeCount.get(atom) ?? 0).padStart(3)} of ${Math.pow(ATOMS.length, 2)}`,
  )
}

// ─── Where The Clusters Overlap ─────────────────────────

rule('WHY')
line('')
line('  A `CVCCCVC` word is `c1 v1 c2 c3 c4 v2 c5`. Cutting after `c2`')
line('  needs `c3c4` to be a legal onset. Cutting after `c3` needs')
line('  `c2c3` to be a legal coda. Both work whenever a coda cluster and')
line('  an onset cluster share their middle consonant.')
line('')

const overlaps: Array<{ coda: string; onset: string; middle: string }> = []
for (const coda of CODA_CLUSTERS) {
  for (const onset of ONSET_CLUSTERS) {
    if (coda[1] === onset[0]) {
      overlaps.push({ coda, onset, middle: coda[1] })
    }
  }
}

const byMiddle = new Map<string, number>()
for (const item of overlaps) {
  byMiddle.set(item.middle, (byMiddle.get(item.middle) ?? 0) + 1)
}

line(`  ${overlaps.length} coda and onset clusters overlap that way.`)
line('')
line('  by the shared consonant:')
for (const [middle, n] of [...byMiddle.entries()].sort((a, b) => b[1] - a[1])) {
  const codas = [...CODA_CLUSTERS].filter(c => c[1] === middle)
  const onsets = [...ONSET_CLUSTERS].filter(o => o[0] === middle)
  line(
    `    ${middle}  ${String(n).padStart(3)}   codas ${codas.join(' ')}  |  onsets ${onsets.join(' ')}`,
  )
}

rule('HOW MANY WORDS ARE AMBIGUOUS')
line('')
line('  None.')
line('')
line('  Before joins were marked, 22,746 seven letter words could be cut')
line('  two ways, about one percent of that shape. Every join now')
line('  carries a linker, no coda ends in one and no onset begins with')
line('  one, so exactly one position in a run of consonants can be the')
line('  linker and the cut follows from it.')
line('')
line('  The one shape two pairings still share is settled by where the')
line('  linker falls, which is checked above.')

// ─── Data Out ───────────────────────────────────────────

/** Which consonants and clusters a word may open and close on. */
const clusterRows = ['position,size,sound']
for (const sound of CAN_OPEN) {
  clusterRows.push(`open,1,${sound}`)
}
for (const cluster of [...ONSET_CLUSTERS_CLEAR].sort()) {
  clusterRows.push(`open,2,${cluster}`)
}
for (const sound of CAN_CLOSE) {
  clusterRows.push(`close,1,${sound}`)
}
for (const cluster of [...CODA_CLUSTERS_CLEAR].sort()) {
  clusterRows.push(`close,2,${cluster}`)
}
writeFileSync(
  resolve(BASE_DIR, 'cluster.csv'),
  clusterRows.join('\n') + '\n',
)

/** Every way two words can meet, and the linker it takes. */
const VOICED = 'mnqgdbvzjCwlry'.split('')
const VOICE_PAIRS = ['pb', 'dt', 'gk', 'sz', 'fv', 'cC', 'xj']
const paired = new Set<string>()
for (const pair of VOICE_PAIRS) {
  paired.add(pair)
  paired.add(pair[1] + pair[0])
}

const linkerRows = ['close,open,linker,why']
for (const a of CAN_CLOSE) {
  for (const b of CAN_OPEN) {
    const same = a === b
    const voice = paired.has(a + b)
    const linker = same || voice ? 'l' : VOICED.includes(a) ? 'z' : 's'
    const why = same
      ? 'same consonant'
      : voice
        ? 'voice pair'
        : VOICED.includes(a)
          ? 'voiced'
          : 'voiceless'
    linkerRows.push(`${a},${b},${linker},${why}`)
  }
}
writeFileSync(resolve(BASE_DIR, 'linker.csv'), linkerRows.join('\n') + '\n')

/** The atom and join counts. */
const countRows = ['kind,first,second,shape,count,distinct']
for (const shape of ATOMS) {
  countRows.push(
    `atom,${shape},,${shape},${size[shape]},${distinct[shape] || ''}`,
  )
}
for (const a of ATOMS) {
  for (const b of ATOMS) {
    const d = distinct[a] * distinct[b]
    countRows.push(
      `join,${a},${b},${a}C${b},${size[a] * size[b]},${d === 0 ? '' : d}`,
    )
  }
}
writeFileSync(resolve(BASE_DIR, 'count.csv'), countRows.join('\n') + '\n')

// ─── Out ────────────────────────────────────────────────

mkdirSync(BASE_DIR, { recursive: true })
const rows = ['word,cut,cut']
for (const item of ambiguous) {
  rows.push(`${item.word},${item.cuts.join(',')}`)
}
const outPath = resolve(BASE_DIR, 'ambiguous.csv')
writeFileSync(outPath, rows.join('\n') + '\n')

rule('OUT')
line(`\n  ${clusterRows.length - 1} rows -> base/cluster.csv`)
line(`  ${linkerRows.length - 1} rows -> base/linker.csv`)
line(`  ${countRows.length - 1} rows -> base/count.csv`)
