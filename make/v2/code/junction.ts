/**
 * Consonant Cluster Junction Resolution
 *
 * Resolves consonant clusters at word junctions into
 * pronounceable forms. Minimum output is always 2C.
 *
 * Uses:
 *   1. Precomputed mapping (from sounds.ts generation)
 *   2. Inline simplification (assimilation, subset enumeration)
 *   3. Onset/coda cluster matching
 *
 * Usage:
 *   import { resolveJunction } from './junction'
 *   const options = resolveJunction({ coda: 'nt', onset: 'br' })
 */

import fs from 'fs'
import path from 'path'
import {
  clusterDifficulty,
  HARD_THRESHOLD,
  ONSET_CLUSTERS,
  CODA_CLUSTERS,
} from './phonology'

const MIN_JUNCTION = 2
const MAX_JUNCTION = 3

// ─── Voice Assimilation ─────────────────────────────────

const VOICE_PAIRS: Record<string, string> = {
  p: 'b', t: 'd', k: 'g', s: 'z', f: 'v', c: 'C', x: 'j',
  b: 'p', d: 't', g: 'k', z: 's', v: 'f', C: 'c', j: 'x',
}
const VOICED_OBS = new Set(['b', 'd', 'g', 'z', 'v', 'C', 'j'])
const ALL_OBS = new Set(['b', 'd', 'g', 'p', 't', 'k', 's', 'z', 'f', 'v', 'c', 'C', 'x', 'j'])

/**
 * Voice-assimilate a consonant cluster: adjacent obstruents
 * must share voicing, determined by the leftmost obstruent.
 * Nasals and liquids are neutral and reset the chain.
 */
function voiceAssimilateCluster(cluster: string): string {
  const chars = cluster.split('')
  let requiredVoiced: boolean | null = null
  for (let i = 0; i < chars.length; i++) {
    if (!ALL_OBS.has(chars[i])) {
      requiredVoiced = null
      continue
    }
    const isVoiced = VOICED_OBS.has(chars[i])
    if (requiredVoiced === null) {
      requiredVoiced = isVoiced
    } else if (isVoiced !== requiredVoiced) {
      chars[i] = VOICE_PAIRS[chars[i]] ?? chars[i]
    }
  }
  return chars.join('')
}

// ─── Precomputed Mapping ────────────────────────────────

const MAPPING_PATH = path.resolve(
  __dirname,
  '../text/consonant-clusters-mapping.json',
)

let mapping: Record<string, string> | null = null

function getMapping(): Record<string, string> {
  if (mapping) return mapping

  try {
    if (fs.existsSync(MAPPING_PATH)) {
      mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8'))
      return mapping!
    }
  } catch {}

  mapping = {}
  return mapping
}

/**
 * Look up a cluster in the precomputed mapping.
 * Returns null if not found or result is < 2C.
 */

export function lookupMapping(cluster: string): string | null {
  const map = getMapping()

  if (map[cluster] && map[cluster].length >= MIN_JUNCTION) {
    return map[cluster]
  }

  if (clusterDifficulty(cluster) < HARD_THRESHOLD) {
    return cluster.length >= MIN_JUNCTION ? cluster : null
  }

  return null
}

// ─── Assimilation ──────────────────────────────────────

/**
 * Apply natural phonological assimilation.
 * Drops internal h and collapses stop+nasal sequences,
 * but preserves minimum 2C for junction use.
 */

export function assimilate(cluster: string): string {
  const chars = cluster.split('')

  const result: string[] = []
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]

    if (ch === 'h' && i > 0) continue

    result.push(ch)
  }

  return result.join('')
}

// ─── Subset Enumeration ────────────────────────────────

function combinations(n: number, choose: number): number[][] {
  const result: number[][] = []

  function build(start: number, combo: number[]) {
    if (combo.length === choose) {
      result.push([...combo])
      return
    }
    for (let i = start; i < n; i++) {
      combo.push(i)
      build(i + 1, combo)
      combo.pop()
    }
  }

  build(0, [])
  return result
}

function removalBias(pos: number, length: number): number {
  if (pos === length - 1) return 4
  if (pos === 0) return 2
  return 0
}

// ─── Junction Resolution ────────────────────────────────

export type JunctionOption = {
  consonants: string
  form:
    | 'keep'
    | 'mapped'
    | 'onset'
    | 'coda'
    | 'overlap'
    | 'partial-drop'
    | 'assimilated'
    | 'geminate'
  score: number
}

function isEasyCluster(cluster: string): boolean {
  if (cluster.length <= 1) return true
  return clusterDifficulty(cluster) < HARD_THRESHOLD
}

/**
 * Resolve a junction (coda of word1 + onset of word2) into
 * all valid forms with minimum 2C.
 *
 * Returns ranked options, best first.
 */

export function resolveJunction(input: {
  coda: string
  onset: string
}): Array<JunctionOption> {
  const { coda, onset } = input
  const junction = coda + onset
  const results: Array<JunctionOption> = []
  const seen = new Set<string>()

  function add(
    rawConsonants: string,
    form: JunctionOption['form'],
    score: number,
  ) {
    const consonants = voiceAssimilateCluster(rawConsonants)
    if (consonants.length < MIN_JUNCTION) return
    if (consonants.length > MAX_JUNCTION) return
    if (seen.has(consonants)) return
    seen.add(consonants)

    const d = clusterDifficulty(consonants)

    /**
     * Allow geminates and geminate-with-separator forms.
     * Many languages have geminates (Italian, Finnish, Japanese).
     */
    const isGeminate =
      consonants.length === 2 && consonants[0] === consonants[1]
    const isGeminateForm = form === 'geminate'
    if (d >= 99 && !isGeminate && !isGeminateForm) return

    const effectiveD = isGeminate || isGeminateForm ? 1 : d
    results.push({ consonants, form, score: score - effectiveD * 0.1 })
  }

  /** 1. Keep intact if easy. */
  if (junction.length >= MIN_JUNCTION && isEasyCluster(junction)) {
    add(junction, 'keep', 1.0)
  }

  /** 2. Overlap: if last of coda equals first of onset. */
  if (
    coda.length > 0 &&
    onset.length > 0 &&
    coda[coda.length - 1] === onset[0]
  ) {
    const overlapped = coda + onset.slice(1)
    if (overlapped.length >= MIN_JUNCTION && isEasyCluster(overlapped)) {
      add(overlapped, 'overlap', 0.95)
    }
  }

  /** 3. Check if junction forms a valid onset or coda cluster. */
  if (junction.length >= MIN_JUNCTION) {
    if (ONSET_CLUSTERS.has(junction)) add(junction, 'onset', 0.9)
    if (CODA_CLUSTERS.has(junction)) add(junction, 'coda', 0.9)
  }

  /** 4. Precomputed mapping. */
  const mapped = lookupMapping(junction)
  if (mapped && mapped !== junction && mapped.length >= MIN_JUNCTION) {
    add(mapped, 'mapped', 0.85)
  }

  /** 5. Assimilation. */
  const assimilated = assimilate(junction)
  if (
    assimilated !== junction &&
    assimilated.length >= MIN_JUNCTION
  ) {
    const d = clusterDifficulty(assimilated)
    const isGem =
      assimilated.length === 2 && assimilated[0] === assimilated[1]
    if (d < HARD_THRESHOLD || isGem) {
      add(assimilated, 'assimilated', 0.88)
    }
  }

  /** 6. Partial drops for 3-4C junctions. */
  if (junction.length >= 3) {
    for (let i = 0; i < junction.length; i++) {
      const sub = junction.slice(0, i) + junction.slice(i + 1)
      if (sub.length >= MIN_JUNCTION && isEasyCluster(sub)) {
        const posScore =
          i === 0 || i === junction.length - 1 ? 0.65 : 0.75
        add(sub, 'partial-drop', posScore)
      }
    }
  }

  /** 7. All subsets >= 2C for 4C+ junctions. */
  if (junction.length >= 4) {
    const n = junction.length
    for (
      let keepCount = n - 1;
      keepCount >= MIN_JUNCTION;
      keepCount--
    ) {
      const combos = combinations(n, keepCount)
      for (const kept of combos) {
        const result = kept.map(i => junction[i]).join('')

        let bias = 0
        for (let i = 0; i < n; i++) {
          if (!kept.includes(i)) {
            bias += removalBias(i, n)
          }
        }

        const final =
          result.length >= 3
            ? assimilate(result) || result
            : result

        if (final.length >= MIN_JUNCTION) {
          add(final, 'partial-drop', 0.7 - bias * 0.02)
        }
      }
    }
  }

  /**
   * 8. Geminate/confusable resolution: insert a separator consonant
   * when the same or confusable consonants meet at the join point.
   * Keep both consonants, but voice-assimilate the second to match
   * the first. q always becomes n.
   *
   * Fricatives (f v s z c C j x):
   *   Any pair -> {first}l{first}  (e.g. sz -> sls, fv -> flf)
   *
   * Nasals (n m q): keep both, insert z, q->n
   *   e.g. nm -> nzm, qn -> nzn, qm -> nzm
   *
   * Voiced stops (b d g): keep both, insert z
   *   e.g. bd -> bzd, db -> dzb
   *
   * Voiceless stops (p t k): keep both, insert s
   *   e.g. pk -> psk, kt -> kst
   *
   * Mixed voiced/voiceless stops: insert z/s based on first,
   * voice-assimilate second to match first
   *   e.g. bt -> bzd, td -> tsp... wait no: tb -> tsp, gk -> gzg
   */
  if (coda.length > 0 && onset.length > 0) {
    let codaLast = coda[coda.length - 1]
    let onsetFirst = onset[0]

    /**
     * Treat onset 'h' as 's' for junction purposes.
     * h is a weak fricative that behaves like s at join points.
     */
    if (onsetFirst === 'h') onsetFirst = 's'

    /** q always becomes n */
    if (codaLast === 'q') codaLast = 'n'
    if (onsetFirst === 'q') onsetFirst = 'n'

    const FRICATIVE_SET = new Set(['f', 'v', 's', 'z', 'c', 'C', 'j', 'x'])
    const NASAL_SET = new Set(['n', 'm'])
    const VOICED_STOP_SET = new Set(['b', 'd', 'g'])
    const VOICELESS_STOP_SET = new Set(['p', 't', 'k'])
    const ALL_VOICED = new Set([...NASAL_SET, ...VOICED_STOP_SET])
    const ALL_STOP = new Set([...VOICED_STOP_SET, ...VOICELESS_STOP_SET])

    /** Voice-assimilate: convert consonant to match voicing of reference */
    const VOICE_MAP: Record<string, string> = {
      p: 'b', t: 'd', k: 'g',       // voiceless stop -> voiced
      f: 'v', s: 'z', c: 'C', x: 'j', // voiceless fricative -> voiced
    }
    const UNVOICE_MAP: Record<string, string> = {
      b: 'p', d: 't', g: 'k',       // voiced stop -> voiceless
      v: 'f', z: 's', C: 'c', j: 'x', // voiced fricative -> voiceless
    }

    function voiceAssimilate(target: string, referenceIsVoiced: boolean): string {
      if (referenceIsVoiced) return VOICE_MAP[target] ?? target
      return UNVOICE_MAP[target] ?? target
    }

    const VOICED_FRICATIVES = new Set(['v', 'z', 'C', 'j'])
    const isFirstFricativeVoiced = VOICED_FRICATIVES.has(codaLast)

    const bothFricative = FRICATIVE_SET.has(codaLast) && FRICATIVE_SET.has(onsetFirst)
    const bothNasal = NASAL_SET.has(codaLast) && NASAL_SET.has(onsetFirst)
    const bothVoicedStop = VOICED_STOP_SET.has(codaLast) && VOICED_STOP_SET.has(onsetFirst)
    const bothVoicelessStop = VOICELESS_STOP_SET.has(codaLast) && VOICELESS_STOP_SET.has(onsetFirst)
    const firstVoicedStop = ALL_VOICED.has(codaLast) && ALL_STOP.has(onsetFirst)
    const firstVoicelessStop = VOICELESS_STOP_SET.has(codaLast) && ALL_STOP.has(onsetFirst)

    /** Rebuild coda with q->n normalization */
    const normCoda = coda.slice(0, -1) + codaLast
    const restOnset = onset.slice(1)

    if (bothFricative) {
      const assimilated = voiceAssimilate(onsetFirst, isFirstFricativeVoiced)
      add(normCoda + 'l' + assimilated + restOnset, 'geminate', 0.6)
    } else if (bothNasal) {
      add(normCoda + 'z' + onsetFirst + restOnset, 'geminate', 0.6)
    } else if (bothVoicedStop) {
      add(normCoda + 'z' + onsetFirst + restOnset, 'geminate', 0.6)
    } else if (bothVoicelessStop) {
      add(normCoda + 's' + onsetFirst + restOnset, 'geminate', 0.6)
    } else if (firstVoicedStop) {
      const assimilated = voiceAssimilate(onsetFirst, true)
      add(normCoda + 'z' + assimilated + restOnset, 'geminate', 0.6)
    } else if (firstVoicelessStop) {
      const assimilated = voiceAssimilate(onsetFirst, false)
      add(normCoda + 's' + assimilated + restOnset, 'geminate', 0.6)
    } else if (codaLast === onsetFirst) {
      /** Fallback for other same-consonants (l, r, h, w, y). */
      add(normCoda + 'z' + onsetFirst + restOnset, 'geminate', 0.55)
    }
  }

  /** 9. Plain geminate fallback (same letter doubled). */
  if (junction.length === 2 && junction[0] === junction[1]) {
    add(junction, 'geminate', 0.5)
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

/**
 * Get the best junction simplification.
 * Returns the top-ranked option, or the raw junction as fallback.
 */

export function bestJunction(input: {
  coda: string
  onset: string
}): string {
  const options = resolveJunction(input)
  if (options.length > 0) return options[0].consonants
  return input.coda + input.onset
}
