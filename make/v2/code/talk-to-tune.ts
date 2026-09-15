/**
 * Talk-to-Tune Converter
 *
 * Converts IPA -> Talk tokens -> scored Tune CVCVC candidates.
 *
 * Pipeline:
 *   1. IPA -> Talk string (via makeIpaToTalk)
 *   2. Talk string -> Tokens (via tokenize)
 *   3. Tokens -> CV pattern with cluster merging
 *   4. CV pattern -> CVCVC skeleton (position-aware collapse)
 *   5. CVCVC skeleton -> ranked candidate words
 */

import { makeIpaToTalk } from '@cluesurf/talk/ipa'
import {
  tokenize,
  type ConsonantToken,
  type VowelToken,
  type Token,
} from '../../talk.js/make/tokenizer'

// ─── Types ──────────────────────────────────────────────

export type ScoredOption = {
  tune: string
  score: number
}

export type CandidateLevel = Array<ScoredOption>

export type CVCVCCandidate = {
  word: string
  scores: [number, number, number, number, number]
  total: number
}

// ─── Talk -> Tune Mappings ──────────────────────────────

const CONSONANT_MAP: Record<string, Array<ScoredOption>> = {
  m:  [{ tune: 'm', score: 100 }],
  n:  [{ tune: 'n', score: 100 }],
  q:  [{ tune: 'q', score: 100 }],
  g:  [{ tune: 'g', score: 100 }],
  d:  [{ tune: 'd', score: 100 }],
  b:  [{ tune: 'b', score: 100 }],
  p:  [{ tune: 'p', score: 100 }],
  t:  [{ tune: 't', score: 100 }],
  k:  [{ tune: 'k', score: 100 }],
  h:  [{ tune: 'h', score: 100 }],
  s:  [{ tune: 's', score: 100 }],
  f:  [{ tune: 'f', score: 100 }],
  v:  [{ tune: 'v', score: 100 }],
  z:  [{ tune: 'z', score: 100 }],
  j:  [{ tune: 'j', score: 100 }],
  x:  [{ tune: 'x', score: 100 }],
  c:  [{ tune: 'c', score: 100 }],
  C:  [{ tune: 'C', score: 100 }],
  w:  [{ tune: 'w', score: 90 }, { tune: 'v', score: 50 }],
  l:  [{ tune: 'l', score: 100 }],
  r:  [{ tune: 'r', score: 100 }],
  y:  [{ tune: 'y', score: 80 }, { tune: 'n', score: 30 }, { tune: 'l', score: 25 }],
  D:  [{ tune: 'd', score: 80 }, { tune: 't', score: 30 }],
  T:  [{ tune: 't', score: 80 }, { tune: 'd', score: 30 }],
  N:  [{ tune: 'n', score: 80 }],
  L:  [{ tune: 'l', score: 80 }],
  R:  [{ tune: 'r', score: 80 }],
  K:  [{ tune: 'k', score: 70 }, { tune: 'g', score: 30 }],
  G:  [{ tune: 'g', score: 70 }, { tune: 'k', score: 30 }],
  H:  [{ tune: 'h', score: 70 }, { tune: 'k', score: 25 }],
  F:  [{ tune: 'f', score: 80 }],
  V:  [{ tune: 'v', score: 80 }],
  W:  [{ tune: 'v', score: 50 }],
  S:  [{ tune: 's', score: 70 }],
  X:  [{ tune: 'x', score: 80 }],
  J:  [{ tune: 'j', score: 80 }],
  Z:  [{ tune: 'z', score: 70 }],
  Q:  [{ tune: 'k', score: 50 }],
  "'": [{ tune: 'k', score: 30 }],
}

/**
 * Consonant cluster -> single Tune consonant.
 * These are IPA affricates/clusters that should be treated as one unit.
 */
/**
 * Consonant cluster -> single Tune consonant.
 * Affricates merge into one. s+stop clusters prefer the stop.
 */
const CLUSTER_MAP: Record<string, Array<ScoredOption>> = {
  /**
   * dʒ: keep as separate d + j segments (not merged).
   * This preserves both consonants for CVCVC: d at C2, j at C3.
   * e.g., bridge -> b-i-d-a-j, judge -> j-a-d-a-j
   */
  'tx': [{ tune: 'x', score: 90 }],   // tʃ -> x (as in "church")
  'ts': [{ tune: 's', score: 80 }, { tune: 't', score: 60 }],
  'dz': [{ tune: 'z', score: 80 }, { tune: 'd', score: 60 }],
  /** ks and gz: keep as separate segments for better CVCVC distribution. */
  /**
   * s+stop onset clusters: do NOT merge these.
   * They should be kept as two separate consonants (s at C1, stop at C2).
   * Removing from CLUSTER_MAP so they stay as separate segments.
   */
}

const VOWEL_MAP: Record<string, Array<ScoredOption>> = {
  /**
   * Vowel proximity:
   *   i closest to e
   *   e closest to i, also close to a
   *   a closest to o, also close to e
   *   o closest to u, also close to a
   *   u closest to o
   */
  i:    [{ tune: 'i', score: 100 }, { tune: 'e', score: 40 }],
  I:    [{ tune: 'i', score: 80 }, { tune: 'e', score: 50 }],
  'i$': [{ tune: 'i', score: 70 }, { tune: 'e', score: 35 }],
  e:    [{ tune: 'e', score: 100 }, { tune: 'i', score: 40 }, { tune: 'a', score: 25 }],
  E:    [{ tune: 'e', score: 80 }, { tune: 'i', score: 40 }, { tune: 'a', score: 30 }],
  'e$': [{ tune: 'e', score: 70 }, { tune: 'i', score: 35 }],
  a:    [{ tune: 'a', score: 100 }, { tune: 'o', score: 35 }, { tune: 'e', score: 25 }],
  A:    [{ tune: 'a', score: 80 }, { tune: 'e', score: 45 }, { tune: 'o', score: 25 }],
  'a$': [{ tune: 'a', score: 70 }, { tune: 'o', score: 30 }],
  o:    [{ tune: 'o', score: 100 }, { tune: 'u', score: 40 }, { tune: 'a', score: 25 }],
  O:    [{ tune: 'u', score: 70 }, { tune: 'o', score: 60 }, { tune: 'a', score: 25 }],
  'o$': [{ tune: 'o', score: 80 }, { tune: 'u', score: 35 }],
  u:    [{ tune: 'u', score: 100 }, { tune: 'o', score: 40 }],
  U:    [{ tune: 'a', score: 60 }, { tune: 'o', score: 55 }, { tune: 'u', score: 40 }],
  'u$': [{ tune: 'u', score: 70 }, { tune: 'o', score: 35 }],
}

const INSERT_VOWELS: CandidateLevel = [
  { tune: 'a', score: 25 },
  { tune: 'i', score: 20 },
  { tune: 'e', score: 20 },
  { tune: 'o', score: 15 },
  { tune: 'u', score: 15 },
]

const INSERT_CONSONANTS: CandidateLevel = [
  { tune: 'n', score: 20 },
  { tune: 'l', score: 20 },
  { tune: 'r', score: 20 },
  { tune: 'q', score: 18 },
  { tune: 's', score: 15 },
  { tune: 'm', score: 15 },
]

/** For C3 specifically, q (ng) and t are good fillers. */
const INSERT_C3: CandidateLevel = [
  { tune: 'q', score: 25 },
  { tune: 't', score: 23 },
  { tune: 'n', score: 22 },
  { tune: 'l', score: 20 },
  { tune: 'r', score: 20 },
  { tune: 's', score: 15 },
  { tune: 'k', score: 15 },
  { tune: 'm', score: 15 },
]

/**
 * Build C3 fillers that prefer consonants already in the word.
 * The LAST consonant gets the highest score since it's what
 * the listener naturally hears at the end of the word.
 */
function buildC3FromExisting(cs: Array<Segment>): CandidateLevel {
  const existing: CandidateLevel = []
  for (let i = 0; i < cs.length; i++) {
    const seg = cs[i]
    /** Last consonant gets 60% score, others get 30%. */
    const multiplier = i === cs.length - 1 ? 0.6 : 0.3
    for (const opt of seg.options) {
      const score = Math.round(opt.score * multiplier)
      const found = existing.find(e => e.tune === opt.tune)
      if (found) {
        found.score = Math.max(found.score, score)
      } else {
        existing.push({ tune: opt.tune, score })
      }
    }
  }
  /** Merge with defaults, existing consonants ranked higher. */
  const defaults = INSERT_C3.filter(d => !existing.some(e => e.tune === d.tune))
  return [...existing, ...defaults].sort((a, b) => b.score - a.score)
}

/**
 * Merge a diphthong (two adjacent vowels) into one V segment.
 * Both vowels contribute options. The first vowel's options get
 * a slight boost since it's the nucleus. The second vowel's
 * options (the glide) also appear but with lower scores.
 *
 * e.g., aI (as in "tiger") -> a(80), i(70), e(30)
 *       oO (as in "goat")  -> o(80), u(50)
 */
function mergeDiphthong(
  first: CandidateLevel,
  second: CandidateLevel,
): CandidateLevel {
  const byTune = new Map<string, number>()

  /** First vowel options get 80% of their score (nucleus). */
  for (const opt of first) {
    const score = Math.round(opt.score * 0.8)
    const existing = byTune.get(opt.tune) ?? 0
    if (score > existing) byTune.set(opt.tune, score)
  }

  /** Second vowel options get 70% (glide, still important). */
  for (const opt of second) {
    const score = Math.round(opt.score * 0.7)
    const existing = byTune.get(opt.tune) ?? 0
    if (score > existing) byTune.set(opt.tune, score)
  }

  return [...byTune.entries()]
    .map(([tune, score]) => ({ tune, score }))
    .sort((a, b) => b.score - a.score)
}

// ─── CV Segment Building ────────────────────────────────

/**
 * A segment is either a consonant cluster or a vowel,
 * preserving the original sequence order.
 */
type Segment = {
  type: 'C' | 'V'
  options: CandidateLevel
  /** Original talk text for debugging. */
  raw: string
}

/**
 * Convert tokens to segments, merging adjacent consonants
 * into clusters, resolving affricates, and merging diphthongs.
 */
function tokensToSegments(tokens: Array<Token>): Array<Segment> {
  const segments: Array<Segment> = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.form === 'vowel') {
      const vt = token as VowelToken
      const key = vt.rounded ? vt.text + '$' : vt.text
      const options = VOWEL_MAP[key] ?? VOWEL_MAP[vt.text] ?? [{ tune: 'a', score: 10 }]

      /**
       * English post-vocalic 'r' (consonant): absorb into the vowel.
       * In English IPA, V+r (like ɜːr, ər, ɪr) is a vowel-colored-by-r,
       * not a separate rolled r consonant. The Talk 'r' means Spanish
       * rolled r, so English post-vocalic r should be absorbed.
       *
       * Only absorb if r is followed by another consonant or end of word
       * (i.e., it's not an onset r like in "red").
       */
      if (
        i + 1 < tokens.length &&
        tokens[i + 1].form === 'consonant' &&
        (tokens[i + 1] as ConsonantToken).text === 'r'
      ) {
        /** Check if r is post-vocalic (followed by consonant or end). */
        const afterR = i + 2 < tokens.length ? tokens[i + 2] : null
        if (!afterR || afterR.form === 'consonant' || afterR.form === 'space') {
          /** Absorb the r into this vowel. Skip the r token. */
          i += 2 // skip vowel + r
          segments.push({ type: 'V', options, raw: vt.text + 'r' })
          continue
        }
      }

      /**
       * English ɹ appears as Talk vowel u$ (rounded u).
       * When it appears between consonant+vowel (onset, like "tree")
       * OR between vowel+consonant (like "iron"), promote to consonant r.
       * This is handled in the post-pass below (promoteRhotics).
       *
       * For onset position (after C, before V), promote immediately
       * since it's clearly functioning as a consonant.
       */
      if (
        vt.rounded &&
        (vt.text === 'u' || vt.text === 'U') &&
        segments.length > 0 &&
        segments[segments.length - 1].type === 'C' &&
        i + 1 < tokens.length &&
        tokens[i + 1].form === 'vowel'
      ) {
        segments.push({
          type: 'C',
          options: [{ tune: 'r', score: 85 }],
          raw: 'r(ɹ)',
        })
        i++
        continue
      }

      /** Check for diphthong: two adjacent vowels with no consonant between. */
      if (i + 1 < tokens.length && tokens[i + 1].form === 'vowel') {
        const vt2 = tokens[i + 1] as VowelToken
        const key2 = vt2.rounded ? vt2.text + '$' : vt2.text
        const options2 = VOWEL_MAP[key2] ?? VOWEL_MAP[vt2.text] ?? [{ tune: 'a', score: 10 }]

        /** Merge: both vowels contribute options, first vowel gets higher score. */
        const merged = mergeDiphthong(options, options2)
        segments.push({ type: 'V', options: merged, raw: key + key2 })
        i += 2
        continue
      }

      segments.push({ type: 'V', options, raw: key })
      i++
      continue
    }

    if (token.form === 'consonant') {
      /** Collect consecutive consonants. */
      const cluster: Array<ConsonantToken> = []
      while (i < tokens.length && tokens[i].form === 'consonant') {
        cluster.push(tokens[i] as ConsonantToken)
        i++
      }

      /** Try to resolve the cluster. */
      const resolved = resolveCluster(cluster)
      segments.push(...resolved)
      continue
    }

    /** Skip spaces, symbols, etc. */
    i++
  }

  /** Post-pass: promote u$/U$ vowels to consonant r when we need more consonants. */
  return promoteRhotics(segments)
}

/**
 * Promote English ɹ (mapped as vowel u$) to consonant r.
 *
 * Two cases:
 *   1. Word has < 3 consonants: promote any u$ to fill the gap
 *   2. Word-final u$: always promote since final r is audible
 *      and the extra consonant can replace a less important one
 */
function promoteRhotics(segments: Array<Segment>): Array<Segment> {
  const cCount = segments.filter(s => s.type === 'C').length
  const result = [...segments]

  /** Always promote word-final u$ to r. */
  const lastSeg = result[result.length - 1]
  if (lastSeg?.type === 'V' && (lastSeg.raw.includes('u$') || lastSeg.raw.includes('U$'))) {
    result[result.length - 1] = {
      type: 'C' as const,
      options: [{ tune: 'r', score: 75 }],
      raw: 'r(ɹ-final)',
    }
    return result
  }

  /** Also check second-to-last if last was merged diphthong containing u$. */
  if (result.length >= 2) {
    const secondLast = result[result.length - 2]
    if (
      lastSeg?.type === 'C' &&
      secondLast?.type === 'V' &&
      (secondLast.raw.includes('u$') || secondLast.raw.includes('U$'))
    ) {
      /** u$ before final consonant - absorb into vowel (post-vocalic r). */
      /** Don't promote, it's already handled by absorption. */
    }
  }

  /** If we still need more consonants, promote non-final u$. */
  if (cCount < 3) {
    const need = 3 - cCount
    let promoted = 0
    for (let i = 0; i < result.length; i++) {
      if (promoted >= need) break
      const seg = result[i]
      if (seg.type !== 'V') continue
      if (seg.raw.includes('u$') || seg.raw.includes('U$')) {
        result[i] = {
          type: 'C' as const,
          options: [{ tune: 'r', score: 75 }],
          raw: 'r(ɹ-promoted)',
        }
        promoted++
      }
    }
  }

  return result
}

/**
 * Resolve a consonant cluster into one or more C segments.
 * Merges affricates (dj -> j, tx -> x) and picks best
 * representatives from clusters.
 */
function resolveCluster(cluster: Array<ConsonantToken>): Array<Segment> {
  if (cluster.length === 0) return []

  if (cluster.length === 1) {
    const c = cluster[0]
    const options = CONSONANT_MAP[c.text] ?? [{ tune: 'd', score: 10 }]
    return [{ type: 'C', options, raw: c.text }]
  }

  /** Try 2-char affricate merge. */
  if (cluster.length === 2) {
    const pair = cluster[0].text + cluster[1].text
    const merged = CLUSTER_MAP[pair]
    if (merged) {
      return [{ type: 'C', options: merged, raw: pair }]
    }
  }

  /** For longer clusters, try affricate at start, then handle rest. */
  if (cluster.length >= 2) {
    const pair = cluster[0].text + cluster[1].text
    const merged = CLUSTER_MAP[pair]
    if (merged) {
      return [
        { type: 'C', options: merged, raw: pair },
        ...resolveCluster(cluster.slice(2)),
      ]
    }
  }

  /** No affricate. Return each consonant as separate segment,
   *  but with scores reflecting their cluster context. */
  return cluster.map(c => {
    const options = CONSONANT_MAP[c.text] ?? [{ tune: 'd', score: 10 }]
    return { type: 'C', options, raw: c.text }
  })
}

// ─── CVCVC Collapse (Multi-Strategy) ────────────────────

const BANNED_C1 = new Set(['q'])
const BANNED_C3 = new Set(['y', 'w', 'h'])
/**
 * Banned V+C sequences at END of word only (V2+C3 position).
 * il, el, ir, er are not allowed at word-final but fine in the middle.
 */
const BANNED_VC_FINAL = new Set(['il', 'el', 'ir', 'er'])

function filterC1(options: CandidateLevel): CandidateLevel {
  const filtered = options.filter(o => !BANNED_C1.has(o.tune))
  return filtered.length > 0 ? filtered : [{ tune: 'n', score: 10 }]
}

function filterC3(options: CandidateLevel): CandidateLevel {
  const filtered = options.filter(o => !BANNED_C3.has(o.tune))
  return filtered.length > 0 ? filtered : [{ tune: 'n', score: 10 }]
}

/**
 * Acoustic prominence of consonants. Fricatives and affricates
 * are more distinctive than stops in clusters.
 */
/**
 * Acoustic prominence for picking consonants from clusters.
 * Stops rank ABOVE nasals because in medial clusters (nd, mb, nk)
 * the stop is more distinctive to the ear.
 */
const PROMINENCE: Record<string, number> = {
  s: 9, z: 9, x: 9, j: 9, f: 8, v: 8, c: 7, C: 7,
  r: 7, l: 6,
  k: 5, t: 5, p: 5, g: 5, d: 5, b: 5,
  m: 4, n: 4, q: 3,
  h: 2,
}

function getProminence(seg: Segment): number {
  if (seg.options.length === 0) return 0
  const tune = seg.options[0].tune
  return PROMINENCE[tune] ?? 3
}

type FiveSlots = [CandidateLevel, CandidateLevel, CandidateLevel, CandidateLevel, CandidateLevel]

/**
 * Generate multiple CVCVC skeletons using different strategies,
 * then merge all candidates.
 */
function collapseToCVCVC(segments: Array<Segment>): { levels: FiveSlots } {
  const allCandidates: Array<CVCVCCandidate> = []

  /** Collect all consonant and vowel segments in order. */
  const cs: Array<Segment> = []
  const vs: Array<Segment> = []
  for (const s of segments) {
    if (s.type === 'C') cs.push(s)
    else vs.push(s)
  }

  /** Check if word starts with vowel (no consonant before first V). */
  const startsWithVowel = segments.length > 0 && segments[0].type === 'V'

  /** Strategy 1: Follow original order. */
  const s1 = strategyFollowOrder(segments, cs, vs, startsWithVowel)

  /** Strategy 2: Split clusters with vowels. */
  const s2 = strategySplitClusters(segments, cs, vs, startsWithVowel)

  /** Strategy 3: Reorder by prominence (put most distinctive C in best slots). */
  const s3 = strategyByProminence(segments, cs, vs, startsWithVowel)

  /** Merge: pick the strategy with best top-level options. */
  /** Strategy 4: For short words (1-2 consonants), echo the first C
   *  and use 'n'/'q' as fillers to create recognizable CVCVC. */
  let s4: FiveSlots | null = null
  if (cs.length <= 2) {
    const c1Opts = startsWithVowel ? H_OPTION : (cs[0]?.options ?? INSERT_CONSONANTS)
    const v1Opts = vs[0]?.options ?? INSERT_VOWELS
    /** C2: use second consonant if exists, else echo of C1 with lower score. */
    const c2Opts = cs.length >= 2
      ? cs[1].options
      : (cs[0]?.options ?? INSERT_CONSONANTS).map(o => ({ ...o, score: Math.round(o.score * 0.4) }))
    const v2Opts = vs.length > 1 ? vs[1].options : echoVowel(v1Opts)
    const c3Opts = INSERT_C3

    s4 = [filterC1(c1Opts), v1Opts, c2Opts, v2Opts, filterC3(c3Opts)]
  }

  /** Strategy 5: Syllable-aware rules. */
  const s5 = strategySyllableAware(segments, cs, vs, startsWithVowel)

  /** Return merged levels where each position has options from all strategies. */
  const all = [s1, s2, s3, s5]
  if (s4) all.push(s4)
  const merged = mergeLevels(all)

  /** Boost C3 options that reuse consonants from the original word. */
  const existingC3 = buildC3FromExisting(cs)
  for (const opt of existingC3) {
    const found = merged[4].find(o => o.tune === opt.tune)
    if (found) {
      found.score = Math.max(found.score, opt.score)
    } else {
      merged[4].push(opt)
    }
  }
  merged[4].sort((a, b) => b.score - a.score)

  return { levels: merged }
}

function mergeLevels(strategies: Array<FiveSlots>): FiveSlots {
  const result: FiveSlots = [[], [], [], [], []]
  for (const strat of strategies) {
    for (let i = 0; i < 5; i++) {
      for (const opt of strat[i]) {
        if (!result[i].some(o => o.tune === opt.tune)) {
          /** Create a copy so we don't mutate shared constants. */
          result[i].push({ tune: opt.tune, score: opt.score })
        } else {
          /** Keep the higher score. */
          const existing = result[i].find(o => o.tune === opt.tune)!
          if (opt.score > existing.score) {
            existing.score = opt.score
          }
        }
      }
    }
  }
  /** Sort each level by score. */
  for (let i = 0; i < 5; i++) {
    result[i].sort((a, b) => b.score - a.score)
  }
  return result
}

/** H-prefix for vowel-initial words. */
const H_OPTION: CandidateLevel = [{ tune: 'h', score: 70 }]

/**
 * Strategy 1: Distribute all consonants and vowels across CVCVC.
 *
 * Key principle: if we have exactly 3 consonants, use ALL of them.
 * If we have more, pick the 3 most important by position.
 * Vowels fill V1 and V2 in order, echo if only 1.
 */
function strategyFollowOrder(
  segments: Array<Segment>,
  cs: Array<Segment>,
  vs: Array<Segment>,
  startsWithVowel: boolean,
): FiveSlots {
  let c1: CandidateLevel
  let v1: CandidateLevel
  let c2: CandidateLevel
  let v2: CandidateLevel
  let c3: CandidateLevel

  /** Assign consonants. */
  if (startsWithVowel && cs.length === 0) {
    c1 = H_OPTION
    c2 = INSERT_CONSONANTS
    c3 = INSERT_C3
  } else if (startsWithVowel) {
    c1 = H_OPTION
    c2 = cs[0]?.options ?? INSERT_CONSONANTS
    c3 = cs.length > 1 ? cs[cs.length - 1].options : INSERT_CONSONANTS
  } else if (cs.length <= 1) {
    c1 = cs[0]?.options ?? INSERT_CONSONANTS
    c2 = INSERT_CONSONANTS
    c3 = INSERT_C3
  } else if (cs.length === 2) {
    c1 = cs[0].options
    c2 = cs[1].options
    c3 = INSERT_C3
  } else if (cs.length === 3) {
    /** Perfect: use all 3 in order. */
    c1 = cs[0].options
    c2 = cs[1].options
    c3 = cs[2].options
  } else {
    /**
     * 4+: keep first and last. For middle, pick the most prominent
     * consonant that is DIFFERENT from C1. In medial clusters (C-C),
     * prefer the one closest to the next vowel (onset of next syllable).
     */
    c1 = cs[0].options
    c3 = cs[cs.length - 1].options
    const c1Tune = cs[0].options[0]?.tune
    const middles = cs.slice(1, -1)

    /**
     * Pick middle C closest to the next vowel (onset of next syllable).
     * Position bonus makes later consonants in the cluster preferred.
     * Also avoid duplicating C1.
     */
    middles.sort((a, b) => {
      const aIdx = cs.indexOf(a)
      const bIdx = cs.indexOf(b)
      const aIsDup = a.options[0]?.tune === c1Tune ? -20 : 0
      const bIsDup = b.options[0]?.tune === c1Tune ? -20 : 0
      const aScore = getProminence(a) + aIdx * 5 + aIsDup
      const bScore = getProminence(b) + bIdx * 5 + bIsDup
      return bScore - aScore
    })
    c2 = middles[0].options
  }

  /** Assign vowels. */
  if (vs.length === 0) {
    v1 = INSERT_VOWELS
    v2 = INSERT_VOWELS
  } else if (vs.length === 1) {
    v1 = vs[0].options
    v2 = echoVowel(v1)
  } else {
    v1 = vs[0].options
    v2 = vs[vs.length - 1].options
  }

  return [filterC1(c1), v1, c2, v2, filterC3(c3)]
}

/**
 * Strategy 2: Position-aware split.
 * Uses segment order to place consonants relative to vowels.
 * Splits onset/coda clusters across CVCVC boundaries.
 *
 * e.g., fr-a-g -> f-a-r-a-g (split onset fr)
 *       f-a-ks -> f-a-k-a-s (split coda ks)
 */
function strategySplitClusters(
  segments: Array<Segment>,
  cs: Array<Segment>,
  vs: Array<Segment>,
  startsWithVowel: boolean,
): FiveSlots {
  /** Find vowel positions to identify onset/between/coda clusters. */
  const vowelPositions: Array<number> = []
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].type === 'V') vowelPositions.push(i)
  }

  if (vowelPositions.length === 0) {
    /** No vowels at all. Distribute consonants with inserted vowels. */
    return strategyFollowOrder(segments, cs, vs, startsWithVowel)
  }

  const firstV = vowelPositions[0]
  const lastV = vowelPositions[vowelPositions.length - 1]

  /** Onset: consonants before first vowel. */
  const onset = segments.slice(0, firstV).filter(s => s.type === 'C')
  /** Between: consonants between first and last vowel. */
  const between = firstV < lastV
    ? segments.slice(firstV + 1, lastV).filter(s => s.type === 'C')
    : []
  /** Coda: consonants after last vowel. */
  const coda = segments.slice(lastV + 1).filter(s => s.type === 'C')

  let c1: CandidateLevel
  let c2: CandidateLevel
  let c3: CandidateLevel

  if (startsWithVowel) {
    c1 = H_OPTION
    /** Distribute between + coda across C2 and C3. */
    const allMidEnd = [...between, ...coda]
    c2 = allMidEnd[0]?.options ?? INSERT_CONSONANTS
    c3 = allMidEnd.length > 1 ? allMidEnd[allMidEnd.length - 1].options : INSERT_CONSONANTS
  } else if (onset.length >= 2) {
    /** Split onset cluster: first -> C1, second -> C2. */
    c1 = onset[0].options
    c2 = onset[onset.length - 1].options
    c3 = coda.length > 0 ? coda[coda.length - 1].options :
         between.length > 0 ? between[between.length - 1].options : INSERT_CONSONANTS
  } else if (coda.length >= 2) {
    /** Split coda cluster: first coda -> C2, last coda -> C3. */
    c1 = onset[0]?.options ?? INSERT_CONSONANTS
    c2 = coda[0].options
    c3 = coda[coda.length - 1].options
  } else if (between.length >= 2) {
    /**
     * Multiple between consonants (e.g., lobster: b-s-t between vowels).
     * Pick the LAST one for C2 (onset of next syllable = most audible).
     * Pick from coda or remaining between for C3.
     */
    c1 = onset[0]?.options ?? INSERT_CONSONANTS
    c2 = between[between.length - 1].options
    c3 = coda.length > 0 ? coda[coda.length - 1].options :
         between.length > 2 ? between[0].options : INSERT_C3
  } else {
    c1 = onset[0]?.options ?? INSERT_CONSONANTS
    c2 = between.length > 0 ? between[between.length - 1].options :
         coda.length > 0 ? coda[0].options : INSERT_CONSONANTS
    c3 = coda.length > 0 ? coda[coda.length - 1].options : INSERT_C3
  }

  const v1 = segments[firstV].options
  const v2 = vowelPositions.length > 1
    ? segments[lastV].options
    : echoVowel(v1)

  return [filterC1(c1), v1, c2, v2, filterC3(c3)]
}

/**
 * Strategy 3: Order-preserving with prominence tiebreaking.
 *
 * C1 is ALWAYS the first consonant (never reordered).
 * For C2/C3, pick most prominent remaining, in original order.
 */
function strategyByProminence(
  segments: Array<Segment>,
  cs: Array<Segment>,
  vs: Array<Segment>,
  startsWithVowel: boolean,
): FiveSlots {
  let c1: CandidateLevel
  let c2: CandidateLevel
  let c3: CandidateLevel

  if (startsWithVowel) {
    c1 = H_OPTION
    const top2 = cs
      .map((seg, idx) => ({ seg, idx, prom: getProminence(seg) }))
      .sort((a, b) => b.prom - a.prom)
      .slice(0, 2)
      .sort((a, b) => a.idx - b.idx)
    c2 = top2[0]?.seg.options ?? INSERT_CONSONANTS
    c3 = top2[1]?.seg.options ?? INSERT_C3
  } else if (cs.length <= 1) {
    c1 = cs[0]?.options ?? INSERT_CONSONANTS
    c2 = INSERT_CONSONANTS
    c3 = INSERT_C3
  } else if (cs.length === 2) {
    c1 = cs[0].options
    c2 = cs[1].options
    c3 = INSERT_C3
  } else if (cs.length === 3) {
    c1 = cs[0].options
    c2 = cs[1].options
    c3 = cs[2].options
  } else {
    /** 4+: C1 is always first. Pick 2 most prominent from rest, in order. */
    c1 = cs[0].options
    const rest = cs.slice(1)
      .map((seg, idx) => ({ seg, idx: idx + 1, prom: getProminence(seg) }))
      .sort((a, b) => b.prom - a.prom)
      .slice(0, 2)
      .sort((a, b) => a.idx - b.idx)
    c2 = rest[0]?.seg.options ?? INSERT_CONSONANTS
    c3 = rest[1]?.seg.options ?? INSERT_C3
  }

  const v1: CandidateLevel = vs[0]?.options ?? INSERT_VOWELS
  const v2: CandidateLevel = vs.length > 1
    ? vs[vs.length - 1].options
    : echoVowel(v1)

  return [filterC1(c1), v1, c2, v2, filterC3(c3)]
}

/**
 * Strategy 5: Syllable-aware rules.
 *
 * Analyzes the segment pattern to determine syllable structure,
 * then applies specific rules for 1-syl, 2-syl, 3-syl words.
 *
 * Key principles:
 *   1-syl: C1 = first consonant, C3 = LAST consonant (highest priority)
 *   1-syl onset cluster: C1 = cluster[0], C2 = cluster[1] or lastC
 *   1-syl coda cluster: C2 = cluster[0], C3 = cluster[-1]
 *   2-syl: natural CVCVC mapping, medial clusters -> onset of next syl
 *   3-syl: can center on stressed syllable
 */
function strategySyllableAware(
  segments: Array<Segment>,
  cs: Array<Segment>,
  vs: Array<Segment>,
  startsWithVowel: boolean,
): FiveSlots {
  const vowelCount = vs.length
  const consonantCount = cs.length

  /**
   * Identify cluster positions relative to vowels.
   */
  const vowelPositions: Array<number> = []
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].type === 'V') vowelPositions.push(i)
  }

  const firstV = vowelPositions[0] ?? -1
  const lastV = vowelPositions[vowelPositions.length - 1] ?? -1

  const onset = firstV > 0
    ? segments.slice(0, firstV).filter(s => s.type === 'C')
    : []
  const coda = lastV >= 0 && lastV < segments.length - 1
    ? segments.slice(lastV + 1).filter(s => s.type === 'C')
    : []
  const between = firstV >= 0 && lastV > firstV
    ? segments.slice(firstV + 1, lastV).filter(s => s.type === 'C')
    : []

  let c1: CandidateLevel
  let v1: CandidateLevel
  let c2: CandidateLevel
  let v2: CandidateLevel
  let c3: CandidateLevel

  if (startsWithVowel) {
    /**
     * Vowel-initial. For 3-syl, start from first real consonant.
     * For 1-2 syl, use h-prefix.
     */
    if (vowelCount >= 3 && cs.length >= 2) {
      /** 3-syl vowel-initial: start from first consonant. */
      c1 = cs[0].options
      v1 = vs.length > 1 ? vs[1].options : vs[0].options
      c2 = cs.length > 1 ? cs[1].options : INSERT_CONSONANTS
      v2 = vs.length > 2 ? vs[2].options : echoVowel(v1)
      c3 = cs.length > 2 ? cs[cs.length - 1].options : INSERT_C3
    } else {
      c1 = H_OPTION
      v1 = vs[0]?.options ?? INSERT_VOWELS
      c2 = cs[0]?.options ?? INSERT_CONSONANTS
      v2 = vs.length > 1 ? vs[1].options : echoVowel(v1)
      c3 = cs.length > 1 ? cs[cs.length - 1].options : INSERT_C3
    }
  } else if (vowelCount <= 1) {
    /**
     * 1-syllable word.
     * Key rule: LAST consonant has highest priority for C3.
     */
    const firstC = cs[0]?.options ?? INSERT_CONSONANTS
    const lastC = cs[cs.length - 1]?.options ?? INSERT_C3

    if (onset.length >= 2 && coda.length >= 2) {
      /** Onset + coda clusters (e.g., bridge bɹɪdʒ -> b,d,j). */
      c1 = onset[0].options                   // first onset char
      c2 = coda[0].options                    // first coda char (more prominent)
      c3 = coda[coda.length - 1].options      // last coda char
    } else if (onset.length >= 2 && coda.length === 1) {
      /** Onset cluster + single coda (e.g., grease gɹiːs). */
      c1 = onset[0].options                   // first onset char
      c2 = onset[onset.length - 1].options    // second onset char
      c3 = coda[0].options                    // last consonant = highest priority
    } else if (onset.length === 1 && coda.length >= 2) {
      /** Single onset + coda cluster (e.g., milk mɪlk). */
      c1 = onset[0].options                   // onset
      c2 = coda[0].options                    // first coda cluster char
      c3 = coda[coda.length - 1].options      // LAST consonant
    } else if (onset.length === 1 && coda.length === 1) {
      /** Simple CVC (e.g., cat kæt). */
      c1 = firstC
      c2 = lastC                              // echo last consonant
      c3 = lastC.map(o => ({ ...o, score: Math.round(o.score * 0.8) }))
      /** Also add filler options for C3. */
      const fillers = INSERT_C3.filter(f => !c3.some(o => o.tune === f.tune))
      c3 = [...c3, ...fillers]
    } else {
      c1 = firstC
      c2 = cs.length > 1 ? cs[1].options : INSERT_CONSONANTS
      c3 = lastC
    }

    v1 = vs[0]?.options ?? INSERT_VOWELS
    v2 = echoVowel(v1)
  } else if (vowelCount === 2) {
    /**
     * 2-syllable word.
     * Natural CVCVC: C1=onset, C2=medial (onset of 2nd syl), C3=coda.
     * Medial clusters: prefer onset of next syllable.
     */
    c1 = onset.length > 0 ? onset[onset.length > 1 ? 0 : 0].options : INSERT_CONSONANTS

    if (between.length >= 2) {
      /** Medial cluster: pick last (onset of next syllable). */
      c2 = between[between.length - 1].options
    } else if (between.length === 1) {
      c2 = between[0].options
    } else {
      c2 = coda.length > 0 ? coda[0].options : INSERT_CONSONANTS
    }

    c3 = coda.length > 0
      ? coda[coda.length - 1].options
      : INSERT_C3

    v1 = vs[0]?.options ?? INSERT_VOWELS
    v2 = vs[1]?.options ?? echoVowel(v1)
  } else {
    /**
     * 3+ syllable word.
     * Can center on stressed syllable.
     * Default: C1=first C, C2=middle area, C3=last C.
     *
     * For stressed-syllable centering, the strategies above
     * already handle some of this. Here we add another option:
     * keep word-initial C1 but pick C2 from stressed syllable area.
     */
    c1 = cs[0]?.options ?? INSERT_CONSONANTS
    c3 = cs[cs.length - 1]?.options ?? INSERT_C3

    /** Pick C2 from between (onset of middle/stressed syllable). */
    if (between.length > 0) {
      /** Pick the one closest to the second vowel (onset of next syl). */
      c2 = between[between.length - 1].options
    } else if (cs.length >= 3) {
      /** No between consonants, use middle of full consonant list. */
      const midIdx = Math.floor(cs.length / 2)
      c2 = cs[midIdx].options
    } else {
      c2 = cs.length > 1 ? cs[1].options : INSERT_CONSONANTS
    }

    v1 = vs[0]?.options ?? INSERT_VOWELS
    v2 = vs.length > 1 ? vs[vs.length - 1].options : echoVowel(v1)
  }

  return [filterC1(c1), v1, c2, v2, filterC3(c3)]
}

/**
 * Create echo vowel options (for when only 1 vowel exists).
 */
function echoVowel(v: CandidateLevel): CandidateLevel {
  const echoed = v.map(o => ({ ...o, score: Math.round(o.score * 0.4) }))
  const others = INSERT_VOWELS.filter(iv => !echoed.some(e => e.tune === iv.tune))
  return [...echoed, ...others]
}

// ─── Candidate Generation ───────────────────────────────

export function generateCandidates(
  levels: [CandidateLevel, CandidateLevel, CandidateLevel, CandidateLevel, CandidateLevel],
  maxPerLevel = 4,
  maxResults = 20,
): Array<CVCVCCandidate> {
  const [l0, l1, l2, l3, l4] = levels.map(l => l.slice(0, maxPerLevel))

  const candidates: Array<CVCVCCandidate> = []

  for (const c1 of l0) {
    for (const v1 of l1) {
      for (const c2 of l2) {
        for (const v2 of l3) {
          for (const c3 of l4) {
            /** il, el, ir, er banned at word-final (V2+C3) only. */
            const vc2 = v2.tune + c3.tune
            if (BANNED_VC_FINAL.has(vc2)) continue

            const word = c1.tune + v1.tune + c2.tune + v2.tune + c3.tune
            if (word.includes('wa')) continue

            const scores: [number, number, number, number, number] = [
              c1.score, v1.score, c2.score, v2.score, c3.score,
            ]
            let total = scores.reduce((a, b) => a + b, 0)

            /** Penalize same vowel in V1 and V2. */
            if (v1.tune === v2.tune) {
              total -= 40
            }

            /** Penalize duplicate consonants (C1==C2, C2==C3, C1==C3). */
            if (c1.tune === c2.tune) total -= 40
            if (c2.tune === c3.tune) total -= 80
            if (c1.tune === c3.tune) total -= 15

            /** Extra penalty for sibilant repetition. */
            const SIBILANTS = new Set(['s', 'z', 'f', 'v', 'c', 'C', 'j', 'x'])
            if (SIBILANTS.has(c1.tune) && SIBILANTS.has(c3.tune) && c1.tune === c3.tune) {
              total -= 15
            }
            if (SIBILANTS.has(c2.tune) && SIBILANTS.has(c3.tune) && c2.tune === c3.tune) {
              total -= 15
            }
            if (SIBILANTS.has(c1.tune) && SIBILANTS.has(c2.tune) && c1.tune === c2.tune) {
              total -= 15
            }

            candidates.push({ word, scores, total })
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.total - a.total)

  const seen = new Set<string>()
  const unique: Array<CVCVCCandidate> = []
  for (const c of candidates) {
    if (seen.has(c.word)) continue
    seen.add(c.word)
    unique.push(c)
    if (unique.length >= maxResults) break
  }

  return unique
}

// ─── Public API ─────────────────────────────────────────

/**
 * Convert an IPA string to ranked CVCVC Tune candidates.
 */
export function ipaToTuneCandidates(ipa: string, maxResults = 20): Array<CVCVCCandidate> {
  const talkStr = makeIpaToTalk(ipa)
  return talkToTuneCandidates(talkStr, maxResults)
}

/**
 * Convert a Talk notation string to ranked CVCVC Tune candidates.
 */
export function talkToTuneCandidates(talk: string, maxResults = 20): Array<CVCVCCandidate> {
  const tokens = tokenize(talk)
  return tokensToTuneCandidates(tokens, maxResults)
}

/**
 * Convert Talk tokens directly to ranked CVCVC Tune candidates.
 */
export function tokensToTuneCandidates(
  tokens: Array<Token>,
  maxResults = 20,
): Array<CVCVCCandidate> {
  const segments = tokensToSegments(tokens)
  const { levels } = collapseToCVCVC(segments)
  return generateCandidates(levels, 4, maxResults)
}

/**
 * Get the candidate levels and segments (for debugging).
 */
export function talkToCandidateLevels(talk: string): {
  levels: [CandidateLevel, CandidateLevel, CandidateLevel, CandidateLevel, CandidateLevel]
  segments: Array<Segment>
} {
  const tokens = tokenize(talk)
  const segments = tokensToSegments(tokens)
  const { levels } = collapseToCVCVC(segments)
  return { levels, segments }
}
