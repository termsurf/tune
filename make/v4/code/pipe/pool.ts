/**
 * The concepts wanting a word.
 *
 * `input.md` asks for substantially more candidates than there are
 * forms, so the search has something to choose between rather than
 * something to place. These are the sources that exist.
 *
 *   words.md       ~380 base concepts that MUST be three letters
 *   must.csv       the required set
 *   kind.csv       the last-word kinds
 *   build.csv      the constructors
 *   potential.csv  the wide pool
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

import { TERM } from './board'

/** A gloss reduced to what it is actually naming. */
function keyOf(meaning: string): string {
  return meaning
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/,.*$/, ' ')
    .replace(/\bas in\b.*$/, ' ')
    .replace(/\bfrom\b.*$/, ' ')
    .replace(/[^a-z -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type Want = {
  meaning: string
  /** True when the concept is named in `words.md` as needing CVC. */
  short: boolean
  from: string
}

/**
 * Reads `words.md`.
 *
 * The file is a hand written outline inside a fence: headings begin
 * with `#`, a concept sits at the left margin, and an indented line is a
 * gloss or a derivation of the line above it rather than a concept of
 * its own. A line carrying `=` is a definition in terms of other
 * concepts, so the left side is the concept.
 */
export function readWords(): Array<string> {
  const file = resolve(TERM, 'words.md')
  if (!existsSync(file)) {
    return []
  }
  const out: Array<string> = []
  for (const raw of readFileSync(file, 'utf-8').split('\n')) {
    if (raw.startsWith('```') || raw.trim().startsWith('#')) continue
    if (!raw.trim()) continue
    // Indented lines gloss the line above, so they are not concepts.
    if (/^\s/.test(raw)) continue
    let text = raw.trim()
    // `pattern = structure` names `pattern`.
    const eq = text.indexOf('=')
    if (eq > 0) {
      text = text.slice(0, eq)
    }
    // `place (handles "at")` names `place`.
    text = text.replace(/\([^)]*\)/g, ' ')
    // `yes / no -> agreement polarity` names both sides.
    if (text.includes('↔') || text.includes('→')) continue
    for (const part of text.split('/')) {
      const word = part.trim()
      if (word && /^[a-z][a-z .-]*$/.test(word)) {
        out.push(word)
      }
    }
  }
  return [...new Set(out)]
}

function readColumn(name: string): Array<string> {
  const file = resolve(TERM, `${name}.csv`)
  if (!existsSync(file)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows
    .map(r => (r.meaning ?? r.term ?? r.english ?? '').trim())
    .filter(Boolean)
}

/**
 * Everything wanting a word, minus everything that already has one.
 *
 * Order is by source and then alphabetical, so the pool is the same list
 * every run. A pool that reorders between runs makes a seeded search
 * irreproducible even though the seed did not change.
 */
export function readPool(taken: Set<string>): Array<Want> {
  const seen = new Set<string>()
  const out: Array<Want> = []

  /**
   * Already said, under any spelling of the same gloss.
   *
   * Matching on the exact string is not enough and the search proved it:
   * `map` is assigned as `map (map/reduce)`, `x` `y` `z` are assigned as
   * `x-axis` `y-axis` `z-axis`, so the pool offered all four again and
   * the search dutifully found second words for them. A concept said
   * twice is worse than a concept not said, because it spends a form
   * and splits the meaning.
   *
   * So the key is the gloss stripped of its parenthetical and its
   * qualifiers, which catches those without pretending to be semantics.
   */
  const already = new Set<string>()
  for (const meaning of taken) {
    already.add(keyOf(meaning))
    // `x-axis` also answers to `x`.
    const head = keyOf(meaning).split(/[ -]/)[0]
    if (head) already.add(head)
  }

  const add = (meaning: string, short: boolean, from: string): void => {
    const key = keyOf(meaning)
    if (!meaning || seen.has(key) || taken.has(meaning)) return
    if (already.has(key)) return
    seen.add(key)
    out.push({ meaning, short, from })
  }

  for (const word of readWords().sort()) {
    add(word, true, 'words.md')
  }
  for (const name of ['must', 'kind', 'build']) {
    for (const meaning of readColumn(name).sort()) {
      add(meaning, true, `${name}.csv`)
    }
  }
  for (const meaning of readColumn('potential').sort()) {
    add(meaning, false, 'potential.csv')
  }

  return out
}
