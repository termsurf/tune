/**
 * Many variants, one rendering.
 *
 * The problem this solves, in the words that asked for it:
 *
 *   i will fluctuate around back and forth between many choices over
 *   time, so we need a mechanism to track the fluctuation, and have a
 *   final rendering of the current decision, with ability to switch
 *   between and around.
 *
 * ## Why variants and not drafts
 *
 * Keeping many whole copies of the lexicon is the obvious design and it
 * is the wrong one. Copies drift, a change made in one is absent from
 * the rest, and nothing can say WHY two copies differ. After a year
 * there are forty files and no way to tell which is current.
 *
 * So: **one append-only list of claims, plus a tiny file saying which
 * are live.** Every version that ever existed is still there, switching
 * is editing one column, and the final is rendered in a second.
 *
 * ```text
 * claim.csv     every binding ever proposed, NEVER edited, NEVER deleted
 * choice.csv    which claims are live right now
 * render        claims x choices -> the lexicon
 * ```
 *
 * ## The three states
 *
 * From `note/tune/pipeline/state.md`, and the third one is what makes
 * the search terminate.
 *
 * ```text
 * live      this is the current answer
 * shelved   tried, set aside, may come back        <- the fluctuation
 * dropped   decided against, do not offer again
 * ```
 *
 * A claim is never removed, so coming back to an idea from four months
 * ago is flipping `shelved` to `live`, and the record shows you did.
 */

import { parse } from 'csv-parse/sync'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

import { TERM } from './board'

export const VARY = resolve(TERM, 'vary')

export type State = 'live' | 'shelved' | 'dropped'

export type Claim = {
  /** Stable, content-derived, so the same proposal never gets two ids. */
  id: string
  word: string
  meaning: string
  /** `you` or `ai`. Never silently promoted from one to the other. */
  author: 'you' | 'ai'
  made: string
  why: string
}

// ─── Ids ────────────────────────────────────────────────

/**
 * A claim's id is derived from what it says, not from a counter.
 *
 * Two people proposing the same binding get the same id, so the file
 * cannot hold the same idea twice under two names, and an id is
 * reproducible from the row alone. Tone alphabet rather than hex,
 * per the house rule on anything a person can see.
 */
const TONE = 'mnqgdbptkhsfvzjxcCwlry'.split('')

export function claimId(word: string, meaning: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  const text = `${word}|${meaning}`
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193) >>> 0
    h2 = Math.imul(h2 + text.charCodeAt(i) + i, 0x85ebca6b) >>> 0
  }
  let out = ''
  let a = h1
  let b = h2
  for (let i = 0; i < 8; i++) {
    out += TONE[a % TONE.length]
    a = Math.floor(a / TONE.length) || h2
    if (i === 3) {
      out += '-'
      a = b
    }
  }
  return out
}

// ─── Reading ────────────────────────────────────────────

function readCsv(file: string): Array<Record<string, string>> {
  if (!existsSync(file)) return []
  return parse(readFileSync(file, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  })
}

export function readClaims(): Array<Claim> {
  return readCsv(resolve(VARY, 'claim.csv')).map(row => ({
    id: (row.id ?? '').trim(),
    word: (row.word ?? '').trim(),
    meaning: (row.meaning ?? '').trim(),
    author: ((row.author ?? 'ai').trim() as Claim['author']) ?? 'ai',
    made: (row.made ?? '').trim(),
    why: (row.why ?? '').trim(),
  }))
}

export function readChoices(): Map<string, State> {
  const out = new Map<string, State>()
  for (const row of readCsv(resolve(VARY, 'choice.csv'))) {
    const id = (row.id ?? '').trim()
    const state = (row.state ?? '').trim() as State
    if (id && state) {
      out.set(id, state)
    }
  }
  return out
}

// ─── Writing ────────────────────────────────────────────

function ensure(): void {
  if (!existsSync(VARY)) {
    mkdirSync(VARY, { recursive: true })
  }
  const claim = resolve(VARY, 'claim.csv')
  if (!existsSync(claim)) {
    writeFileSync(claim, 'id,word,meaning,author,made,why\n')
  }
  const choice = resolve(VARY, 'choice.csv')
  if (!existsSync(choice)) {
    writeFileSync(choice, 'id,state\n')
  }
}

function csvCell(text: string): string {
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Records a claim. Appends only, so nothing already written can move.
 *
 * Returns the id whether or not it was new, because the caller usually
 * wants to set its state next.
 */
export function addClaim(
  claim: Omit<Claim, 'id' | 'made'> & { made?: string },
): string {
  ensure()
  const id = claimId(claim.word, claim.meaning)
  const known = new Set(readClaims().map(c => c.id))
  if (!known.has(id)) {
    const made = claim.made ?? new Date().toISOString().slice(0, 10)
    const row = [
      id,
      claim.word,
      claim.meaning,
      claim.author,
      made,
      claim.why,
    ]
      .map(csvCell)
      .join(',')
    appendFileSync(resolve(VARY, 'claim.csv'), `${row}\n`)
  }
  return id
}

/**
 * Sets which claims are live.
 *
 * `choice.csv` IS rewritten, because it is the one file that represents
 * now rather than history. Everything it ever said is recoverable from
 * git, and everything it ever pointed at is still in `claim.csv`.
 */
export function writeChoices(choices: Map<string, State>): void {
  ensure()
  const rows = [...choices.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, state]) => `${id},${state}`)
  writeFileSync(
    resolve(VARY, 'choice.csv'),
    `id,state\n${rows.join('\n')}\n`,
  )
}

// ─── Rendering ──────────────────────────────────────────

export type Render = {
  /** meaning -> word, for every live claim that survived. */
  word: Map<string, string>
  /** word -> meaning. */
  meaning: Map<string, string>
  clash: Array<string>
}

/**
 * Claims plus choices, resolved into one assignment.
 *
 * **A clash is reported, never guessed at.** Two live claims on the same
 * word, or on the same meaning, means a decision has not actually been
 * made, and quietly picking one would hide exactly the thing this system
 * exists to show.
 */
export function render(
  claims: Array<Claim> = readClaims(),
  choices: Map<string, State> = readChoices(),
): Render {
  const live = claims.filter(c => choices.get(c.id) === 'live')
  const word = new Map<string, string>()
  const meaning = new Map<string, string>()
  const clash: Array<string> = []

  for (const c of live) {
    const heldBy = meaning.get(c.word)
    if (heldBy !== undefined && heldBy !== c.meaning) {
      clash.push(`${c.word} is claimed by "${heldBy}" and "${c.meaning}"`)
      continue
    }
    const sits = word.get(c.meaning)
    if (sits !== undefined && sits !== c.word) {
      clash.push(`"${c.meaning}" is claimed on ${sits} and ${c.word}`)
      continue
    }
    word.set(c.meaning, c.word)
    meaning.set(c.word, c.meaning)
  }

  return { word, meaning, clash }
}

// ─── History ────────────────────────────────────────────

export type Story = {
  meaning: string
  claims: Array<Claim & { state: State | 'unset' }>
}

/** Everything ever proposed for one meaning, newest choice marked. */
export function storyOf(meaning: string): Story {
  const choices = readChoices()
  return {
    meaning,
    claims: readClaims()
      .filter(c => c.meaning === meaning)
      .map(c => ({ ...c, state: choices.get(c.id) ?? 'unset' })),
  }
}

/** Everything ever proposed for one form. */
export function storyOfWord(word: string): Array<Claim & { state: State | 'unset' }> {
  const choices = readChoices()
  return readClaims()
    .filter(c => c.word === word)
    .map(c => ({ ...c, state: choices.get(c.id) ?? 'unset' }))
}

// ─── Seeding ────────────────────────────────────────────

/**
 * Turns the lexicon as it stands into claims, so the system starts
 * knowing everything already decided rather than empty.
 *
 * Every existing binding becomes a `live` claim authored by `you`,
 * because that is what it is: 1,267 decisions already made by hand.
 */
export function seedFrom(
  pairs: Array<{ word: string; meaning: string }>,
  why = 'in base.csv when the variant system was built',
): number {
  ensure()
  const known = new Set(readClaims().map(c => c.id))
  const choices = readChoices()
  const rows: Array<string> = []
  let added = 0
  for (const { word, meaning } of pairs) {
    if (!word || !meaning) continue
    const id = claimId(word, meaning)
    if (!known.has(id)) {
      rows.push(
        [id, word, meaning, 'you', '2026-09-15', why]
          .map(csvCell)
          .join(','),
      )
      known.add(id)
      added++
    }
    if (!choices.has(id)) {
      choices.set(id, 'live')
    }
  }
  if (rows.length) {
    appendFileSync(resolve(VARY, 'claim.csv'), `${rows.join('\n')}\n`)
  }
  writeChoices(choices)
  return added
}
