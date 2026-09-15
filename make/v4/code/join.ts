/**
 * The joining table: what goes between two words when they are said as
 * one.
 *
 * Every join is marked with a consonant between the two words, so a
 * word boundary is always heard. The mark is a sibilant matching the
 * voice of the consonant before it.
 *
 *   man + man  ->  manzman        n is voiced
 *   dag + man  ->  dagzman        g is voiced
 *   mat + man  ->  matsman        t is voiceless
 *
 * That will not do when the two consonants meeting are the same, or
 * when they differ only by voice. Those are the two cases a listener
 * runs together, and a sibilant between them does not pull them apart.
 * `l` does.
 *
 *   s + s  ->  sls        d + d  ->  dld        p + b  ->  plb
 *   s + z  ->  slz        d + t  ->  dlt
 *
 * Three joiners, `s` `z` `l`, and every one of the 399 ways two words
 * can meet takes exactly one of them.
 *
 * This is the system worked out in v3 on 2026-08-23, and the table it
 * writes is the same one v3 wrote as `linker.csv`, column for column.
 *
 * Writes `base/v4/join.csv` and refuses to if the counts drift from the
 * ones v3 arrived at: 234 `z`, 133 `s`, 18 `l` for a same sound, 14 `l`
 * for a voice pair.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/join.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { BAD_CLOSE, BAD_OPEN, CONSONANTS } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(here, '../../../base/v4')

// ─── The Sounds ─────────────────────────────────────────

const VOICED = 'm n q g d b v z j C w l r y'.split(' ')
const VOICELESS = 'p t k h s f x c'.split(' ')

/** The seven pairs that differ by voice and nothing else. */
const VOICE_PAIRS = 'pb dt gk sz fv cC xj'.split(' ')

/** A consonant that can end a word. */
const CAN_CLOSE = CONSONANTS.filter(c => !BAD_CLOSE.includes(c))

/** A consonant that can start one. */
const CAN_OPEN = CONSONANTS.filter(c => !BAD_OPEN.includes(c))

for (const c of CONSONANTS) {
  if (!VOICED.includes(c) && !VOICELESS.includes(c)) {
    throw new Error(`\`${c}\` is neither voiced nor voiceless`)
  }
}

const voicePaired = new Set<string>()
for (const pair of VOICE_PAIRS) {
  voicePaired.add(pair)
  voicePaired.add(pair[1] + pair[0])
}

// ─── The Rule ───────────────────────────────────────────

type Join = 's' | 'z' | 'l'

type Rule = 'same_sound' | 'voice_pair' | 'voiced' | 'voiceless'

type Meeting = { close: string; open: string; join: Join; rule: Rule }

function joinFor(close: string, open: string): [Join, Rule] {
  // The same consonant twice, or a voice pair, takes `l`.
  if (close === open) {
    return ['l', 'same_sound']
  }
  if (voicePaired.has(close + open)) {
    return ['l', 'voice_pair']
  }

  // Anything else takes a sibilant by the voice of the sound before it.
  return VOICED.includes(close) ? ['z', 'voiced'] : ['s', 'voiceless']
}

const meetings: Array<Meeting> = []
for (const close of CAN_CLOSE) {
  for (const open of CAN_OPEN) {
    const [join, rule] = joinFor(close, open)
    meetings.push({ close, open, join, rule })
  }
}

// ─── The Claims ─────────────────────────────────────────

/** What v3 arrived at, and what its `linker.csv` holds. */
const CLAIMED: Record<Rule, number> = {
  voiced: 234,
  voiceless: 133,
  same_sound: 18,
  voice_pair: 14,
}

const counted: Record<Rule, number> = {
  voiced: 0,
  voiceless: 0,
  same_sound: 0,
  voice_pair: 0,
}
for (const meeting of meetings) {
  counted[meeting.rule]++
}

const drift: Array<string> = []
if (meetings.length !== 399) {
  drift.push(`399 ways two words can meet, got ${meetings.length}`)
}
for (const rule of Object.keys(CLAIMED) as Array<Rule>) {
  if (counted[rule] !== CLAIMED[rule]) {
    drift.push(`${rule}: claimed ${CLAIMED[rule]}, got ${counted[rule]}`)
  }
}
if (drift.length > 0) {
  console.error('the table drifted from what was claimed, not writing')
  for (const line of drift) {
    console.error(`  ${line}`)
  }
  process.exit(1)
}

// ─── Write ──────────────────────────────────────────────

const rows = meetings.map(m => [m.close, m.open, m.join, m.rule].join(','))
const text = ['close,open,join,rule', ...rows].join('\n') + '\n'

mkdirSync(BASE_DIR, { recursive: true })
writeFileSync(resolve(BASE_DIR, 'join.csv'), text)

// ─── Report ─────────────────────────────────────────────

const byJoin: Record<Join, number> = { z: 0, s: 0, l: 0 }
for (const meeting of meetings) {
  byJoin[meeting.join]++
}

console.log(`${CAN_CLOSE.length} can close a word, ${CAN_OPEN.length} can open one`)
console.log(`${meetings.length} ways two words can meet`)
console.log('')
console.log('| join | pairs | why |')
console.log('| :--- | ---: | :--- |')
console.log(`| \`z\` | ${byJoin.z} | after a voiced sound |`)
console.log(`| \`s\` | ${byJoin.s} | after a voiceless sound |`)
console.log(
  `| \`l\` | ${byJoin.l} | ${counted.same_sound} the same sound twice, ${counted.voice_pair} a voice pair |`,
)
console.log('')
console.log(`wrote ${resolve(BASE_DIR, 'join.csv')}`)
