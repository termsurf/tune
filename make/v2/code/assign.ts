/**
 * Constraint-First Assignment
 *
 * Assigns English words to Tune CVCVC words from the trie.
 *
 * Algorithm (Gale-Shapley inspired, constraint-first):
 * 1. Each english word has up to 200 trie matches ranked by score
 * 2. Sort english words by FEWEST matches first (most constrained)
 * 3. Most constrained word picks first (fewest options)
 * 4. Remove chosen trie word from all other entries
 * 5. Re-sort remaining by new constraint level
 * 6. Repeat until all assigned or no matches left
 */

import type { MatchedCandidate } from './trie-match'

// ─── Types ──────────────────────────────────────────────

export type Assignment = {
  english: string
  ipa: string
  talk: string
  tuneWord: string
  score: number
  tier: number
  distance: number
  matchType: 'exact' | 'fuzzy'
}

export type EntryWithMatches = {
  english: string
  ipa: string
  talk: string
  matches: Array<MatchedCandidate>
}

// ─── Assignment ─────────────────────────────────────────

export function assignConstraintFirst(
  entries: Array<EntryWithMatches>,
): Array<Assignment> {
  const assignments: Array<Assignment> = []
  const used = new Set<string>()
  const remaining = new Map<string, EntryWithMatches>()

  for (const entry of entries) {
    if (entry.matches.length > 0) {
      remaining.set(entry.english, entry)
    }
  }

  while (remaining.size > 0) {
    /** Find the most constrained entry (fewest available matches). */
    let mostConstrained: EntryWithMatches | null = null
    let fewestMatches = Infinity

    for (const entry of remaining.values()) {
      const available = entry.matches.filter(m => !used.has(m.word))
      if (available.length === 0) {
        remaining.delete(entry.english)
        continue
      }
      if (available.length < fewestMatches) {
        fewestMatches = available.length
        mostConstrained = entry
      }
    }

    if (!mostConstrained) break

    /** Assign the best available match (highest adjustedScore that isn't used). */
    let bestMatch: MatchedCandidate | undefined
    for (const m of mostConstrained.matches) {
      if (!used.has(m.word)) {
        bestMatch = m
        break
      }
    }
    if (!bestMatch) {
      remaining.delete(mostConstrained.english)
      continue
    }

    used.add(bestMatch.word)
    remaining.delete(mostConstrained.english)

    assignments.push({
      english: mostConstrained.english,
      ipa: mostConstrained.ipa,
      talk: mostConstrained.talk,
      tuneWord: bestMatch.word,
      score: bestMatch.adjustedScore,
      tier: bestMatch.tier,
      distance: bestMatch.distance,
      matchType: bestMatch.matchType,
    })
  }

  /** Report unassigned. */
  const assigned = new Set(assignments.map(a => a.english))
  const unassigned = entries.filter(e => !assigned.has(e.english))
  if (unassigned.length > 0) {
    console.warn(`\n${unassigned.length} words could not be assigned:`)
    for (const e of unassigned) {
      const avail = e.matches.filter(m => !used.has(m.word)).length
      console.warn(`  ${e.english} (${e.matches.length} total, ${avail} available)`)
    }
  }

  console.log(`  ${assignments.length} assigned, ${unassigned.length} unassigned`)

  return assignments
}
