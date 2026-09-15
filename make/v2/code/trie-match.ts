/**
 * Trie-Walking Matcher
 *
 * Two-pass approach:
 *   Pass 1: Start from raw candidates (best first), try substitutions
 *   Pass 2: Walk trie breadth with sequence-aware pruning (if needed)
 *
 * Each trie word found is scored against ALL raw candidates using
 * position-aware phonetic distance. Raw candidates encode the correct
 * sequence, so comparison preserves order information.
 */

import { type TrieNode, hasWord, getTier } from './trie'
import type { CVCVCCandidate } from './talk-to-tune'
import {
  wordPhoneticDistance,
  consonantSimilarityAt,
  vowelSimilarity,
} from './similarity'

const TUNE_CONSONANTS = 'mnqgdbptksfvzjxcClrwy'.split('')
const TUNE_VOWELS = ['i', 'e', 'a', 'o', 'u']

// ─── Types ──────────────────────────────────────────────

export type MatchedCandidate = CVCVCCandidate & {
  tier: number
  distance: number
  adjustedScore: number
  matchType: 'exact' | 'fuzzy'
}

const TIER_BONUS: Record<number, number> = {
  1: 0.4,
  2: 0.3,
  3: 0.2,
  4: 0.1,
}

// ─── Main Entry ─────────────────────────────────────────

export function walkTrieForMatches(
  trie: TrieNode,
  candidates: Array<CVCVCCandidate>,
  maxResults = 200,
): Array<MatchedCandidate> {
  if (candidates.length === 0) return []

  const found = new Map<string, { walkScore: number; tier: number }>()
  const sortedCandidates = [...candidates].sort(
    (a, b) => b.total - a.total,
  )

  /**
   * Pass 1: Candidate-first search.
   * Start from each raw candidate (highest scored first) and
   * try single, double, and triple substitutions.
   */
  for (const c of sortedCandidates) {
    const [c1, v1, c2, v2, c3] = c.word.split('')

    const tryAdd = (word: string, quality: number) => {
      if (found.has(word)) return
      if (!hasWord(trie, word)) return
      found.set(word, {
        walkScore: c.total * quality,
        tier: getTier(trie, word),
      })
    }

    /** Exact match. */
    tryAdd(c.word, 2.0)

    /** Single substitutions. */
    for (const nc of TUNE_CONSONANTS) {
      tryAdd(c1 + v1 + c2 + v2 + nc, 1.5) // C3
      tryAdd(c1 + v1 + nc + v2 + c3, 1.3) // C2
      tryAdd(nc + v1 + c2 + v2 + c3, 0.8) // C1
    }
    for (const nv of TUNE_VOWELS) {
      tryAdd(c1 + nv + c2 + v2 + c3, 1.5) // V1
      tryAdd(c1 + v1 + c2 + nv + c3, 1.5) // V2
    }

    /** Double substitutions. */
    for (const nv1 of TUNE_VOWELS) {
      for (const nv2 of TUNE_VOWELS) {
        tryAdd(c1 + nv1 + c2 + nv2 + c3, 1.2) // V1+V2
      }
      for (const nc of TUNE_CONSONANTS) {
        tryAdd(c1 + nv1 + c2 + v2 + nc, 1.0) // V1+C3
        tryAdd(c1 + v1 + nc + nv1 + c3, 1.0) // C2+V2
      }
    }
    for (const nv2 of TUNE_VOWELS) {
      for (const nc of TUNE_CONSONANTS) {
        tryAdd(c1 + v1 + c2 + nv2 + nc, 1.0) // V2+C3
      }
    }
    for (const nc2 of TUNE_CONSONANTS) {
      for (const nc3 of TUNE_CONSONANTS) {
        tryAdd(c1 + v1 + nc2 + v2 + nc3, 0.9) // C2+C3
      }
    }

    /** Triple: V1+V2+C3 (keep C1+C2). */
    for (const nv1 of TUNE_VOWELS) {
      for (const nv2 of TUNE_VOWELS) {
        for (const nc of TUNE_CONSONANTS) {
          tryAdd(c1 + nv1 + c2 + nv2 + nc, 0.8) // V1+V2+C3
        }
      }
    }

    /** Triple: V1+C2+V2 (keep C1+C3). */
    for (const nv1 of TUNE_VOWELS) {
      for (const nc2 of TUNE_CONSONANTS) {
        for (const nv2 of TUNE_VOWELS) {
          tryAdd(c1 + nv1 + nc2 + nv2 + c3, 0.7) // V1+C2+V2
        }
      }
    }

    /** Quadruple: keep only C1. */
    for (const nv1 of TUNE_VOWELS) {
      for (const nc2 of TUNE_CONSONANTS) {
        for (const nv2 of TUNE_VOWELS) {
          for (const nc3 of TUNE_CONSONANTS) {
            tryAdd(c1 + nv1 + nc2 + nv2 + nc3, 0.5) // all but C1
          }
        }
      }
    }
  }

  /**
   * Pass 2: Trie walk with sequence-aware pruning.
   * Only if pass 1 found fewer than 30 words.
   */
  if (found.size < 30) {
    const wantC1 = buildWantMap(candidates, 0)
    const wantV1 = buildWantMap(candidates, 1)
    const wantC2 = buildWantMap(candidates, 2)
    const wantV2 = buildWantMap(candidates, 3)
    const wantC3 = buildWantMap(candidates, 4)

    for (const [c1Char, c1Node] of trie.children) {
      const c1Alive = candidates.filter(
        c => consonantSimilarityAt(c1Char, c.word[0], 'onset') >= 20,
      )
      if (c1Alive.length === 0) continue

      for (const [v1Char, v1Node] of c1Node.children) {
        const v1Alive = c1Alive.filter(
          c => vowelSimilarity(v1Char, c.word[1]) >= 10,
        )
        if (v1Alive.length === 0) continue

        for (const [c2Char, c2Node] of v1Node.children) {
          const c2Alive = v1Alive.filter(
            c => consonantSimilarityAt(c2Char, c.word[2], 'onset') >= 15,
          )
          if (c2Alive.length === 0) continue

          for (const [v2Char, v2Node] of c2Node.children) {
            const v2Alive = c2Alive.filter(
              c => vowelSimilarity(v2Char, c.word[3]) >= 10,
            )
            if (v2Alive.length === 0) continue

            for (const [c3Char, c3Node] of v2Node.children) {
              if (!c3Node.isWord) continue
              const c3Alive = v2Alive.filter(
                c => consonantSimilarityAt(c3Char, c.word[4], 'coda') >= 5,
              )
              if (c3Alive.length === 0) continue

              const word =
                c1Char + v1Char + c2Char + v2Char + c3Char
              if (found.has(word)) continue

              const bestAlive = Math.max(
                ...c3Alive.map(c => c.total),
              )
              found.set(word, {
                walkScore:
                  bestSim(c1Char, wantC1, 'onset', false) * 5 +
                  bestSim(v1Char, wantV1, 'onset', true) +
                  bestSim(c2Char, wantC2, 'onset', false) * 2 +
                  bestSim(v2Char, wantV2, 'onset', true) +
                  bestSim(c3Char, wantC3, 'coda', false) * 4 +
                  bestAlive * 0.3,
                tier: c3Node.tier,
              })
            }
          }
        }
      }
    }
  }

  /**
   * Score each found trie word against ALL raw candidates.
   * The raw candidate has phonemes in the right order, so
   * wordPhoneticDistance captures sequence similarity.
   */
  const matched: Array<MatchedCandidate> = []

  /**
   * C1 preservation bonus: if a trie word's C1 matches the top
   * raw candidate's C1, add a bonus. C1 is the most recognizable
   * part of the word and should be strongly preserved.
   */
  const topC1 = sortedCandidates[0]?.word[0] ?? ''

  for (const [word, { tier }] of found) {
    let bestScore = -Infinity
    let bestCandidate: CVCVCCandidate | null = null
    let bestDist = 0

    for (const c of candidates) {
      const dist = wordPhoneticDistance(c.word, word)
      /**
       * Distance multiplier is 2 (not 4). The wordPhoneticDistance
       * already has position weights built in (C1*5, C3*4, C2*2),
       * so multiplying by 4 again was double-penalizing mismatches
       * and letting exact-match h-prefix words beat better-sounding
       * consonant-initial alternatives.
       */
      let score =
        c.total - dist * 2 + (TIER_BONUS[tier] ?? 0)
      /** Bonus for preserving the top candidate's C1. */
      if (word[0] === topC1) score += 20
      if (score > bestScore) {
        bestScore = score
        bestCandidate = c
        bestDist = dist
      }
    }

    if (bestCandidate && bestScore > 0) {
      matched.push({
        word,
        scores: bestCandidate.scores,
        total: bestCandidate.total,
        tier,
        distance: bestDist,
        matchType: bestDist === 0 ? 'exact' : 'fuzzy',
        adjustedScore: bestScore,
      })
    }
  }

  matched.sort((a, b) => b.adjustedScore - a.adjustedScore)
  return matched.slice(0, maxResults)
}

// ─── Helpers ────────────────────────────────────────────

function buildWantMap(
  candidates: Array<CVCVCCandidate>,
  position: number,
): Map<string, number> {
  const want = new Map<string, number>()
  for (const c of candidates) {
    const ch = c.word[position]
    want.set(ch, Math.max(want.get(ch) ?? 0, c.total))
  }
  return want
}

function bestSim(
  letter: string,
  wanted: Map<string, number>,
  position: 'onset' | 'coda',
  isVowel: boolean,
): number {
  let best = 0
  for (const [w] of wanted) {
    const sim = isVowel
      ? vowelSimilarity(letter, w)
      : consonantSimilarityAt(letter, w, position)
    if (sim > best) best = sim
  }
  return best
}
