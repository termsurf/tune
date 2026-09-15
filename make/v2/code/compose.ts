/**
 * Word Composition
 *
 * Takes 2-3 words/syllables and merges them into candidate words.
 * Uses junction resolution to simplify consonant clusters at
 * join points.
 *
 * Minimum junction = 2 consonants (CC).
 *
 * Input shapes:
 *   CVC   (3 chars): hit, mot, raz
 *   CVCC  (4 chars): bant, molk (coda cluster)
 *   CCVC  (4 chars): bran, trik (onset cluster)
 *   CVCVC (5 chars): malik, tabin (multi-syllable)
 *
 * 2-syllable output shapes (min 2C junction):
 *   CVC  + CVC  -> C+V+CC+V+C       (6 letters)
 *   CVC  + CCVC -> C+V+[2-3C]+V+C   (6-7 letters)
 *   CVCC + CVC  -> C+V+[2-3C]+V+C   (6-7 letters)
 *   CVCC + CCVC -> C+V+[2-4C]+V+C   (6-8 letters)
 *   CCVC + CVC  -> CC+V+CC+V+C      (7 letters)
 *   CCVC + CVCC -> CC+V+CC+V+CC     (8 letters)
 *
 * Phonological constraints:
 *   - Words cannot start with y, w, or q
 *   - Words cannot end in y, w, or h
 *   - The sequence "wa" is reserved for tier 3 joining
 *
 * Usage:
 *   import { composeWordCandidates } from './compose'
 *   const candidates = composeWordCandidates(['hit', 'mot'])
 *   const candidates = composeWordCandidates(['hit', 'mot', 'raz'])
 */

import {
  ONSET_CLUSTERS,
  CODA_CLUSTERS,
  isConsonant,
  isVowel,
  clusterDifficulty,
  HARD_THRESHOLD,
} from './phonology'
import { resolveJunction, type JunctionOption } from './junction'

// ─── Types ─────────────────────────────────────────────

export type ComposeCandidate = {
  word: string
  pattern: string
  junctions: Array<string>
  score: number
}

type ParsedWord = {
  onset: string
  vowel: string
  coda: string
  raw: string
}

// ─── Word Parser ────────────────────────────────────────

/**
 * Parse a word into leading consonants (onset), all vowels+middle
 * consonants (core), and trailing consonants (coda).
 *
 * Handles single syllables (CVC, CVCC, CCVC) and multi-syllable
 * words (CVCVC, CVCCVC, etc.).
 *
 * The "onset" is the leading consonant cluster before the first vowel.
 * The "vowel" is everything from the first vowel to the last vowel (inclusive).
 * The "coda" is the trailing consonant cluster after the last vowel.
 */

function parseWord(word: string): ParsedWord | null {
  if (word.length < 2) return null

  /** Find first and last vowel positions. */
  let firstVowel = -1
  let lastVowel = -1
  let vowelCount = 0
  for (let i = 0; i < word.length; i++) {
    if (isVowel(word[i])) {
      if (firstVowel < 0) firstVowel = i
      lastVowel = i
      vowelCount++
    }
  }

  if (vowelCount === 0) return null
  if (firstVowel === 0) return null

  const onset = word.slice(0, firstVowel)
  const vowelCore = word.slice(firstVowel, lastVowel + 1)
  const coda = word.slice(lastVowel + 1)

  if (coda.length === 0) return null

  /** Validate onset consonants. */
  if (!onset.split('').every(isConsonant)) return null
  if (onset.length === 2 && !ONSET_CLUSTERS.has(onset)) return null
  if (onset.length > 2) return null

  /** Validate coda consonants. */
  if (!coda.split('').every(isConsonant)) return null
  if (coda.length === 2 && !CODA_CLUSTERS.has(coda)) return null
  if (coda.length > 2) return null

  /**
   * For single-syllable: vowelCore is 1 vowel.
   * For multi-syllable (e.g., CVCVC): vowelCore is like "i_o" where
   * _ is a consonant cluster. Validate internal clusters.
   */
  if (vowelCount === 1) {
    /** Single vowel. Just check it's a vowel. */
    if (!isVowel(vowelCore)) return null
  } else {
    /**
     * Multi-vowel. Validate that vowels are separated by at least
     * one consonant (no diphthongs). Also validate internal clusters.
     */
    let prevWasVowel = false
    let run = ''
    for (const ch of vowelCore) {
      if (isConsonant(ch)) {
        run += ch
        prevWasVowel = false
      } else {
        /** Adjacent vowels not allowed. */
        if (prevWasVowel) return null
        if (run.length > 0) {
          /** Internal clusters must be pronounceable. */
          if (run.length > 3) return null
          run = ''
        }
        prevWasVowel = true
      }
    }
  }

  return { onset, vowel: vowelCore, coda, raw: word }
}

// ─── Helpers ───────────────────────────────────────────

function isEasyCluster(cluster: string): boolean {
  if (cluster.length <= 1) return true
  return clusterDifficulty(cluster) < HARD_THRESHOLD
}

/**
 * Check if a consonant cluster is a geminate-with-separator pattern.
 * e.g., nzn, nsn, sls, zlz
 */
function isGeminateWithSeparator(cluster: string): boolean {
  if (cluster.length !== 3) return false
  return cluster[0] === cluster[2]
}

const MAX_CLUSTER = 3

const VOICED_OBSTRUENTS = new Set(['b', 'd', 'g', 'z', 'v', 'C', 'j'])
const VOICELESS_OBSTRUENTS = new Set(['p', 't', 'k', 's', 'f', 'c', 'x'])
const ALL_OBSTRUENTS = new Set([...VOICED_OBSTRUENTS, ...VOICELESS_OBSTRUENTS])

/**
 * Check that adjacent obstruents in a consonant cluster share voicing.
 * Nasals (m, n, q) and liquids (l, r) are neutral and reset the chain.
 */
function hasConsistentVoicing(cluster: string): boolean {
  let requiredVoiced: boolean | null = null
  for (const ch of cluster) {
    if (!ALL_OBSTRUENTS.has(ch)) {
      requiredVoiced = null
      continue
    }
    const isVoiced = VOICED_OBSTRUENTS.has(ch)
    if (requiredVoiced === null) {
      requiredVoiced = isVoiced
    } else if (isVoiced !== requiredVoiced) {
      return false
    }
  }
  return true
}

function wordIsPronounceable(word: string): boolean {
  if (word.length === 0 || word.length > 18) return false

  let run = ''
  for (const ch of word) {
    if (isConsonant(ch)) {
      run += ch
      if (run.length > MAX_CLUSTER) return false
    } else if (isVowel(ch)) {
      if (run.length >= 2) {
        if (!hasConsistentVoicing(run)) return false
        if (!isEasyCluster(run)) {
          const isGeminate = run.length === 2 && run[0] === run[1]
          const isGemSep = isGeminateWithSeparator(run)
          if (!isGeminate && !isGemSep) return false
        }
      }
      run = ''
    } else {
      return false
    }
  }

  if (run.length > MAX_CLUSTER) return false
  if (run.length >= 2) {
    if (!hasConsistentVoicing(run)) return false
    if (!isEasyCluster(run)) {
      const isGeminate = run.length === 2 && run[0] === run[1]
      const isGemSep = isGeminateWithSeparator(run)
      if (!isGeminate && !isGemSep) return false
    }
  }
  return true
}

const BANNED_WORD_START = new Set(['y', 'w', 'q'])
const BANNED_WORD_END = new Set(['y', 'w', 'h'])

function isValidWord(word: string): boolean {
  if (word.length < 6) return false
  if (BANNED_WORD_START.has(word[0])) return false
  if (BANNED_WORD_END.has(word[word.length - 1])) return false
  if (word.includes('wa')) return false
  return wordIsPronounceable(word)
}

// ─── Scoring ───────────────────────────────────────────

function scoreCandidate(input: {
  word: string
  originalPhonemes: string
  patternRank: number
}): number {
  const { word, originalPhonemes, patternRank } = input

  /** Transparency: fraction of original phonemes preserved. */
  let preserved = 0
  const remaining = [...originalPhonemes]
  for (const ch of word) {
    const idx = remaining.indexOf(ch)
    if (idx >= 0) {
      preserved++
      remaining.splice(idx, 1)
    }
  }
  const transparency = preserved / originalPhonemes.length

  /** Junction quality: average ease of consonant clusters. */
  let totalDifficulty = 0
  let clusterCount = 0
  let run = ''
  for (const ch of word) {
    if (isConsonant(ch)) {
      run += ch
    } else {
      if (run.length >= 2) {
        const d = clusterDifficulty(run)
        const isGem = run.length === 2 && run[0] === run[1]
        totalDifficulty += isGem ? 1 : d
        clusterCount++
      }
      run = ''
    }
  }
  if (run.length >= 2) {
    const d = clusterDifficulty(run)
    const isGem = run.length === 2 && run[0] === run[1]
    totalDifficulty += isGem ? 1 : d
    clusterCount++
  }
  const avgDifficulty =
    clusterCount > 0 ? totalDifficulty / clusterCount : 0
  const easeScore = Math.max(0, 1 - avgDifficulty / HARD_THRESHOLD)

  /** Length: shorter words preferred. Normalize 6-14 range. */
  const lengthScore = Math.max(0, 1 - (word.length - 6) / 8)

  return (
    transparency * 0.5 +
    easeScore * 0.25 +
    lengthScore * 0.15 +
    patternRank * 0.1
  )
}

// ─── Pattern Classification ────────────────────────────

function classifyJunction(jr: JunctionOption): string {
  if (jr.form === 'keep' || jr.form === 'onset') {
    if (ONSET_CLUSTERS.has(jr.consonants)) return '[onset]'
  }
  if (jr.form === 'keep' || jr.form === 'coda') {
    if (CODA_CLUSTERS.has(jr.consonants)) return '[coda]'
  }
  if (jr.consonants.length >= 2) return '[map]'
  return 'CC'
}

// ─── 2-Word Composition ───────────────────────────────

function compose2(
  s1: ParsedWord,
  s2: ParsedWord,
  originalPhonemes: string,
): Array<ComposeCandidate> {
  const candidates: Array<ComposeCandidate> = []
  const junctionResolutions = resolveJunction({
    coda: s1.coda,
    onset: s2.onset,
  })

  for (const jr of junctionResolutions) {
    const word =
      s1.onset + s1.vowel + jr.consonants + s2.vowel + s2.coda

    if (!isValidWord(word)) continue

    const jLabel = classifyJunction(jr)
    const pattern = `${s1.onset.length > 1 ? '[onset]+' : 'C+'}V+${jLabel}+V+${s2.coda.length > 1 ? '[coda]' : 'C'}`

    candidates.push({
      word,
      pattern,
      junctions: [jr.consonants],
      score: scoreCandidate({
        word,
        originalPhonemes,
        patternRank: jr.score,
      }),
    })
  }

  return candidates
}

// ─── 3-Word Composition ───────────────────────────────

function compose3(
  s1: ParsedWord,
  s2: ParsedWord,
  s3: ParsedWord,
  originalPhonemes: string,
): Array<ComposeCandidate> {
  const candidates: Array<ComposeCandidate> = []

  const j1Resolutions = resolveJunction({
    coda: s1.coda,
    onset: s2.onset,
  })
  const j2Resolutions = resolveJunction({
    coda: s2.coda,
    onset: s3.onset,
  })

  const j1Top = j1Resolutions.slice(0, 6)
  const j2Top = j2Resolutions.slice(0, 6)

  for (const j1 of j1Top) {
    for (const j2 of j2Top) {
      const word =
        s1.onset +
        s1.vowel +
        j1.consonants +
        s2.vowel +
        j2.consonants +
        s3.vowel +
        s3.coda

      if (!isValidWord(word)) continue

      const j1Label = classifyJunction(j1)
      const j2Label = classifyJunction(j2)
      const pattern = `${s1.onset.length > 1 ? '[onset]+' : 'C+'}V+${j1Label}+V+${j2Label}+V+${s3.coda.length > 1 ? '[coda]' : 'C'}`

      const combinedRank = (j1.score + j2.score) / 2

      candidates.push({
        word,
        pattern,
        junctions: [j1.consonants, j2.consonants],
        score: scoreCandidate({
          word,
          originalPhonemes,
          patternRank: combinedRank,
        }),
      })
    }
  }

  return candidates
}

// ─── Public API ────────────────────────────────────────

/**
 * Compose 2-3 words/syllables into candidate words.
 *
 * Each input can be CVC, CVCC, CCVC, or multi-syllable (CVCVC, etc.).
 * Junction between inputs always has at least 2 consonants.
 * Returns candidates sorted by score (best first), deduplicated.
 */

export function composeWordCandidates(
  syllables: Array<string>,
): Array<ComposeCandidate> {
  if (syllables.length < 2 || syllables.length > 3) {
    throw new Error(
      `Expected 2-3 syllables, got ${syllables.length}`,
    )
  }

  const parsed = syllables.map(s => {
    const p = parseWord(s)
    if (!p) {
      throw new Error(
        `"${s}" is not a valid syllable (CVC/CVCC/CCVC/CVCVC/...)`,
      )
    }
    return p
  })

  const originalPhonemes = syllables.join('')

  let candidates: Array<ComposeCandidate>

  if (parsed.length === 2) {
    candidates = compose2(parsed[0], parsed[1], originalPhonemes)
  } else {
    candidates = compose3(
      parsed[0],
      parsed[1],
      parsed[2],
      originalPhonemes,
    )
  }

  const seen = new Set<string>()
  const unique: Array<ComposeCandidate> = []
  for (const c of candidates) {
    if (!seen.has(c.word)) {
      seen.add(c.word)
      unique.push(c)
    }
  }

  unique.sort((a, b) => b.score - a.score)
  return unique
}
