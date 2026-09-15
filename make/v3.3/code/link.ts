/**
 * Joining words with a linking consonant.
 *
 * Two words joined can leave two consonants touching that Moon will not
 * say next to each other: the same one twice, or two that differ by so
 * little they cannot be told apart. Rather than forbid the join, put a
 * consonant between them.
 *
 *   s + s   ->  sls        d + d   ->  dld
 *   s + z   ->  slz        d + t   ->  dlt
 *   z + s   ->  zls
 *
 * `l` does that job, because it is the one consonant that never ends an
 * onset cluster and never opens a coda cluster, so it cannot be
 * mistaken for part of either. When `l` is itself one of the two
 * consonants, `s` stands in for it.
 *
 *   l + l   ->  lsl        l + r   ->  lsr        r + l   ->  rsl
 *
 * That is the whole idea, and it only works if the linker cannot be
 * read as anything else. A run of three consonants at a join has three
 * possible readings:
 *
 *   X Y Z   ->  coda `XY`  then onset `Z`
 *           ->  coda `X`   then onset `YZ`
 *           ->  coda `X`   linker `Y`   onset `Z`
 *
 * The linker is safe exactly when the first two readings are closed
 * off, which means the cluster lists must not contain the pairs the
 * linker would otherwise imitate.
 *
 * This works out which pairs those are rather than guessing, and says
 * what banning each one costs.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/talk/code/link.ts
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  VOICED,
  VOICELESS,
  joinWords,
  linkerFor,
  needsLinker,
  toShape,
} from '#/make/talk/code/sound'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = resolve(__dirname, '../../..')

function line(text: string) {
  console.log(text)
}

function rule(title: string) {
  line(`\n${'='.repeat(60)}`)
  line(title)
  line('='.repeat(60))
}

// ─── The Linkers ────────────────────────────────────────

const LINKERS = ['s', 'z', 'l']

/** A single consonant that can close a syllable. */
const CAN_CLOSE = CONSONANTS.filter(c => !['y', 'h', 'w'].includes(c))

/** A single consonant that can open one. */
const CAN_OPEN = CONSONANTS.filter(c => c !== 'q')

// ─── Where A Linker Is Needed ───────────────────────────

type Meeting = { a: string; b: string; linker: string | null }

const meetings: Array<Meeting> = []
for (const a of CAN_CLOSE) {
  for (const b of CAN_OPEN) {
    meetings.push({ a, b, linker: needsLinker(a, b) ? linkerFor(a, b) : null })
  }
}

rule('WHERE A LINKER IS NEEDED')
line(`\n  ${VOICED.length} voiced consonants, ${VOICELESS.length} voiceless`)
line(`  ${CAN_CLOSE.length} can close a word, ${CAN_OPEN.length} can open one`)
line(`  ${meetings.length} ways two words can meet`)
line(`  ${meetings.filter(m => m.linker).length} need a linker, ${meetings.filter(m => !m.linker).length} run straight together`)
line('')
const byLinker = new Map<string, Array<Meeting>>()
for (const meeting of meetings) {
  if (meeting.linker) {
    byLinker.set(meeting.linker, [...(byLinker.get(meeting.linker) ?? []), meeting])
  }
}
for (const linker of LINKERS) {
  const held = byLinker.get(linker) ?? []
  line(`    ${linker}  ${String(held.length).padStart(3)}  ${held.map(m => m.a + m.b).join(' ')}`)
}

rule('THE EXAMPLES')
line('')
for (const [first, second] of [
  ['maz', 'zan'],
  ['bal', 'zan'],
  ['baz', 'lan'],
  ['bal', 'lan'],
  ['balt', 'man'],
  ['balt', 'tan'],
  ['baz', 'zan'],
  ['ban', 'niq'],
] as Array<[string, string]>) {
  const a = first[first.length - 1]
  const b = second[0]
  const linker = needsLinker(a, b) ? linkerFor(a, b) : null
  line(
    `  ${(first + ' + ' + second).padEnd(13)} -> ${joinWords(first, second).padEnd(9)} ${(linker ? `${linker} joiner` : 'no joiner').padEnd(10)}`,
  )
}

// ─── What Has To Go ─────────────────────────────────────

/**
 * A linker in the middle of three consonants has to be readable as a
 * linker and nothing else. Two readings have to be shut off for every
 * linker: the linker closing a coda cluster, and the linker opening an
 * onset cluster.
 *
 * That is the sweeping form of the rule, and it is simpler than
 * chasing the pairs one at a time: no word may end on a consonant plus
 * a linker, and none may begin on a linker plus a consonant.
 */
const banCoda = new Set<string>()
const banOnset = new Set<string>()

for (const cluster of CODA_CLUSTERS) {
  if (LINKERS.includes(cluster[1])) {
    banCoda.add(cluster)
  }
}
for (const cluster of ONSET_CLUSTERS) {
  if (LINKERS.includes(cluster[0])) {
    banOnset.add(cluster)
  }
}

rule('WHAT HAS TO GO')
line('')
line(`  No word may end on a consonant plus a linker, and none may`)
line(`  begin on a linker plus a consonant. Linkers are \`${LINKERS.join('`, `')}\`.`)
line('')
line(`  coda clusters to drop  (${banCoda.size} of ${CODA_CLUSTERS.size})`)
line(`    ${[...banCoda].sort().join(' ')}`)
line('')
line(`  onset clusters to drop (${banOnset.size} of ${ONSET_CLUSTERS.size})`)
line(`    ${[...banOnset].sort().join(' ')}`)
line('')
line('  By linker:')
for (const linker of LINKERS) {
  const codas = [...banCoda].filter(c => c[1] === linker).sort()
  const onsets = [...banOnset].filter(c => c[0] === linker).sort()
  line(`    ${linker}   codas ${codas.join(' ') || 'none'}`)
  line(`        onsets ${onsets.join(' ') || 'none'}`)
}
line('')
line('  `l` is nearly free. No onset cluster begins with it and only')
line('  `rl` ends with it. The sibilants are where the cost is, because')
line('  `s` opens nine onset clusters and both close a great many codas.')

// ─── What It Costs ──────────────────────────────────────

const lexicon: Array<string> = []
for (const row of readFileSync(resolve(PACKAGE_DIR, 'tune.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const term = (row.split(',')[1] ?? '').trim()
  if (term) {
    lexicon.push(term)
  }
}

rule('WHAT IT COSTS')

const hit = new Map<string, Array<string>>()
for (const term of lexicon) {
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
    const isOnset = i + 1 <= firstVowel
    const isCoda = i >= lastVowel
    if ((isOnset && banOnset.has(pair)) || (isCoda && banCoda.has(pair))) {
      hit.set(pair, [...(hit.get(pair) ?? []), term])
    }
  }
}

line(`\n  ${[...hit.values()].reduce((n, w) => n + w.length, 0)} words in tune.csv use a cluster that would go\n`)
for (const [pair, words] of [...hit.entries()].sort(
  (a, b) => b[1].length - a[1].length,
)) {
  line(`    ${pair}  ${String(words.length).padStart(3)}  ${words.slice(0, 10).join(' ')}`)
}
const untouched = [...banCoda, ...banOnset].filter(p => !hit.has(p))
if (untouched.length > 0) {
  line('')
  line(`  ${untouched.join(' ')} cost nothing, no word uses them`)
}

// ─── What Is Left ───────────────────────────────────────

rule('WHAT IS LEFT')
line('')
line(`  codas:  ${[...CODA_CLUSTERS].filter(c => !banCoda.has(c)).sort().join(' ')}`)
line('')
line(`  onsets: ${[...ONSET_CLUSTERS].filter(c => !banOnset.has(c)).sort().join(' ')}`)

// ─── Everything Together ────────────────────────────────

rule('EVERYTHING A WORD CANNOT DO')
line('')
line('  Three rules were already there, about what a syllable can be.')
line('  Three more come from marking the joins. Together:')
line('')
line('  at the end of a word')
line('')
for (const linker of LINKERS) {
  const held = [...CODA_CLUSTERS].filter(c => c[1] === linker).sort()
  line(`    C${linker}${' '.repeat(6)}a consonant then \`${linker}\`, which is a linker`)
  line(`${' '.repeat(12)}drops ${held.length === 0 ? 'nothing' : held.join(' ')}`)
}
line(`    y w h${' '.repeat(2)}too weak to close a syllable`)
line('    il el   a close front vowel then a liquid, which blurs')
line('    ir er')
line('')
line('  at the start of a word')
line('')
for (const linker of LINKERS) {
  const held = [...ONSET_CLUSTERS].filter(c => c[0] === linker).sort()
  line(`    ${linker}C${' '.repeat(6)}\`${linker}\` then a consonant, which is a linker`)
  line(`${' '.repeat(12)}drops ${held.length === 0 ? 'nothing' : held.join(' ')}`)
}
line('    q       cannot open a syllable')
line('')
line('  The liquid is easy to miss. `l` is a linker too, so `Cl` at the')
line('  end and `lC` at the start have to go for the same reason `Cs`')
line('  and `sC` do. It costs almost nothing, because no onset cluster')
line('  begins with `l` and only `rl` ends with it, but the rule has to')
line('  be there or `rlr` reads two ways.')

rule('THE RULE, WRITTEN OUT')
line('')
line('  Every join is marked with a consonant between the two words.')
line('')
line('    the same consonant twice, or a voice pair    `l`')
line('    anything else, after a voiced consonant      `z`')
line('    anything else, after a voiceless consonant   `s`')
line('')
line('  For that to be readable, no word may end on a consonant plus a')
line('  linker, and none may begin on a linker plus a consonant. Then a')
line('  linker in the middle of three consonants can only be a linker.')
