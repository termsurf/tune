// m,"mark"
// n,"note"
// q,"sing", the -ng sound
// g,"gift"
// d,"deed"
// b,"band"
// p,"play"
// t,"time"
// k,"king"
// h,"heal"
// s,"soul"
// f,"fire"
// v,"vibe"
// z,"zone"
// j,"measure", the "s" sound here, "zh"
// x,"ship", the "sh" sound
// c,"thor", the voiceless "th" sound
// C,"this", the voiced "th" sound
// w,"wave"
// l,"love"
// r,"rise" but with spanish, arabic, or indian accent
// y,"yard"

/**
 * Consonant Cluster Mapping Generator
 *
 * Generates all possible consonant clusters at word junctions
 * and maps hard-to-pronounce ones to simpler forms.
 *
 * Minimum output = 2 consonants (CC). No single-consonant
 * junctions allowed.
 *
 * Uses Gale-Shapley stable matching to avoid collisions
 * where multiple hard clusters would map to the same result.
 *
 * Output files go to deck/tune/text/:
 *   - consonant-clusters-mapping.tsv
 *   - consonant-clusters-mapping.json
 *   - consonant-clusters-outputs.tsv
 *   - consonant-clusters.csv
 *
 * Usage:
 *   tsx deck/tune/make/sounds.ts
 */

import {
  CONSONANT_ORDER,
  clusterDifficulty,
  HARD_THRESHOLD,
  ONSET_CLUSTERS,
  CODA_CLUSTERS,
  place,
  manner,
  voiced,
  sonority as getSonority,
  type Place,
  type Manner,
} from '#/code/phonology'

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEXT_DIR = resolve(__dirname, '../../../text')

const consonants = CONSONANT_ORDER
const vowels = 'ieaou'.split('')

const startConsonantClusters = [...ONSET_CLUSTERS]
const endConsonantClusters = [...CODA_CLUSTERS]

const MIN_OUTPUT = 2
const MAX_OUTPUT = 3

// ─── Cluster Joining ────────────────────────────────────────

function joinClusters(
  ends: string[],
  starts: string[],
): string[] {
  const result = new Set<string>()
  for (const end of ends) {
    for (const start of starts) {
      const lastOfEnd = end[end.length - 1]
      const firstOfStart = start[0]
      if (lastOfEnd === firstOfStart) {
        result.add(end + start.slice(1))
      } else {
        result.add(end + start)
      }
    }
  }
  return [...result].sort()
}

function joinConsonantWithStarts(
  cs: string[],
  starts: string[],
): string[] {
  const result = new Set<string>()
  for (const c of cs) {
    for (const start of starts) {
      if (c === start[0]) {
        result.add(start)
      } else {
        result.add(c + start)
      }
    }
  }
  return [...result].sort()
}

function joinEndsWithConsonant(
  ends: string[],
  cs: string[],
): string[] {
  const result = new Set<string>()
  for (const end of ends) {
    for (const c of cs) {
      if (end[end.length - 1] === c) {
        result.add(end)
      } else {
        result.add(end + c)
      }
    }
  }
  return [...result].sort()
}

// ─── Assimilation ───────────────────────────────────────────

const BANNED_FINAL = new Set(['q', 'h', 'y', 'w'])

const VOICELESS_OF: Record<string, string> = {
  d: 't', b: 'p', g: 'k', z: 's', v: 'f', j: 'x', C: 'c',
}
const VOICED_OF: Record<string, string> = {
  t: 'd', p: 'b', k: 'g', s: 'z', f: 'v', x: 'j', c: 'C',
}

function isVoicingPair(a: string, b: string): boolean {
  return VOICELESS_OF[a] === b || VOICED_OF[a] === b
}

function assimilate(cluster: string): string {
  let chars = cluster.split('')

  const merged: string[] = []
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const next = chars[i + 1]
    if (next && isVoicingPair(ch, next)) {
      const after = chars[i + 2]
      if (after) {
        merged.push(voiced(after) ? (voiced(ch) ? ch : next) : (!voiced(ch) ? ch : next))
      } else {
        merged.push(voiced(ch) ? next : ch)
      }
      i++
      continue
    }
    merged.push(ch)
  }
  chars = merged

  const result: string[] = []
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const next = chars[i + 1]
    if (ch === 'h' && i > 0) continue
    if (next && manner(ch) === 'stop' && manner(next) === 'nasal') {
      const remaining = [...result, ...chars.slice(i + 1)]
      const lastChar = remaining[remaining.length - 1]
      if (!lastChar || !BANNED_FINAL.has(lastChar)) {
        continue
      }
    }
    if (next && ch === next) continue
    result.push(ch)
  }

  return result.join('')
}

// ─── Simplification ────────────────────────────────────────

function positionBias(pos: number, length: number): number {
  if (pos === length - 1) return 3
  if (pos === 0) return 1
  return 0
}

function simplifyOnce(cluster: string): string {
  if (cluster.length <= MIN_OUTPUT) return cluster

  const currentScore = clusterDifficulty(cluster)
  let bestCandidate = cluster
  let bestAdjusted = currentScore
  let bestRaw = currentScore

  for (let i = 0; i < cluster.length; i++) {
    const candidate = cluster.slice(0, i) + cluster.slice(i + 1)
    if (candidate.length < MIN_OUTPUT) continue

    const raw = clusterDifficulty(candidate)
    const adjusted = raw + positionBias(i, cluster.length)

    if (adjusted < bestAdjusted || (adjusted === bestAdjusted && raw < bestRaw)) {
      bestAdjusted = adjusted
      bestRaw = raw
      bestCandidate = candidate
    }
  }

  return bestCandidate
}

// ─── Candidate Generation ──────────────────────────────────

type Candidate = {
  result: string
  difficulty: number
  adjusted: number
}

function removalCost(removed: number[], length: number): number {
  let cost = 0
  for (const pos of removed) {
    if (pos === length - 1) cost += 4
    else if (pos === 0) cost += 1
  }
  return cost
}

function generateCandidates(cluster: string): Candidate[] {
  const candidates: Candidate[] = []
  const seen = new Set<string>()

  function addCandidate(result: string, bias: number) {
    const final = result.length >= 3
      ? (assimilate(result) || result)
      : result

    /** Enforce min 2C and max 3C output. */
    if (final.length < MIN_OUTPUT) return
    if (final.length > MAX_OUTPUT) return

    if (seen.has(final)) return
    seen.add(final)

    const d = clusterDifficulty(final)
    if (d >= 99) return

    candidates.push({
      result: final,
      difficulty: d,
      adjusted: d + bias,
    })
  }

  const assimilated = assimilate(cluster)
  if (assimilated !== cluster && assimilated.length >= MIN_OUTPUT) {
    const d = clusterDifficulty(assimilated)
    if (d < 99) {
      addCandidate(assimilated, 0)
    }
  }

  const n = cluster.length
  if (n <= 1) {
    return candidates
  }

  for (let keepCount = n - 1; keepCount >= MIN_OUTPUT; keepCount--) {
    const combos = combinations(n, keepCount)
    for (const kept of combos) {
      const result = kept.map(i => cluster[i]).join('')
      const removed: number[] = []
      for (let i = 0; i < n; i++) {
        if (!kept.includes(i)) removed.push(i)
      }
      const bias = removalCost(removed, n)
      addCandidate(result, bias)
    }
  }

  candidates.sort((a, b) => {
    if (a.adjusted !== b.adjusted) return a.adjusted - b.adjusted
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty
    return b.result.length - a.result.length
  })

  return candidates
}

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

// ─── Main ────────────────────────────────────────────────────

const junctionConsonants = consonants.filter(
  c => c !== 'h' && c !== 'w' && c !== 'y' && c !== 'c' && c !== 'C'
)

const endStartJoined = joinClusters(endConsonantClusters, startConsonantClusters)
const consonantStartJoined = joinConsonantWithStarts(junctionConsonants, startConsonantClusters)
const endConsonantJoined = joinEndsWithConsonant(endConsonantClusters, junctionConsonants)

type ClusterEntry = {
  cluster: string
  source: string
  difficulty: number
}

const allEntries: ClusterEntry[] = []

function addEntries(source: string, clusters: string[]) {
  for (const cluster of clusters) {
    allEntries.push({
      cluster,
      source,
      difficulty: clusterDifficulty(cluster),
    })
  }
}

addEntries('start', startConsonantClusters)
addEntries('end', endConsonantClusters)
addEntries('end+start', endStartJoined)
addEntries('c+start', consonantStartJoined)
addEntries('end+c', endConsonantJoined)

const EASY_THRESHOLD = 0
const easy: ClusterEntry[] = []
const medium: ClusterEntry[] = []
const hard: ClusterEntry[] = []

for (const entry of allEntries) {
  if (entry.difficulty >= 99) {
    hard.push(entry)
  } else if (entry.difficulty >= HARD_THRESHOLD) {
    hard.push(entry)
  } else if (entry.difficulty <= EASY_THRESHOLD) {
    easy.push(entry)
  } else {
    if (entry.cluster.length >= 3) {
      medium.push(entry)
    } else {
      easy.push(entry)
    }
  }
}

type SimplifyEntry = ClusterEntry & {
  candidates: Candidate[]
  assigned: string
  assignedDifficulty: number
  mustSimplify: boolean
  proposalIdx: number
}

const hardEntries: SimplifyEntry[] = hard.map(e => ({
  ...e,
  candidates: generateCandidates(e.cluster),
  assigned: '',
  assignedDifficulty: 0,
  mustSimplify: true,
  proposalIdx: 0,
}))

const mediumEntries: SimplifyEntry[] = medium.map(e => ({
  ...e,
  candidates: generateCandidates(e.cluster),
  assigned: '',
  assignedDifficulty: 0,
  mustSimplify: false,
  proposalIdx: 0,
}))

const allSimplifyEntries = [...hardEntries, ...mediumEntries]

// ─── Stable Matching (Gale-Shapley) ─────────────────────────

const reservedByEasy = new Set<string>()
for (const e of easy) {
  reservedByEasy.add(e.cluster)
}

const slots = new Map<string, SimplifyEntry | null>()

const free: SimplifyEntry[] = allSimplifyEntries.filter(
  e => e.candidates.length > 0
)

const noCandidates = allSimplifyEntries.filter(
  e => e.candidates.length === 0
)
for (const entry of noCandidates) {
  entry.assigned = entry.cluster
  entry.assignedDifficulty = entry.difficulty
}

for (const entry of free) {
  entry.proposalIdx = 0
}

function priority(entry: SimplifyEntry): number {
  return entry.candidates.length + (entry.mustSimplify ? 0 : 1000)
}

const unmatched: SimplifyEntry[] = [...free]
let iterations = 0
const maxIterations = free.length * 10

while (unmatched.length > 0 && iterations < maxIterations) {
  iterations++

  const entry = unmatched.shift()!
  if (entry.proposalIdx >= entry.candidates.length) {
    if (entry.mustSimplify) {
      const best = entry.candidates[0]
      if (best) {
        entry.assigned = best.result
        entry.assignedDifficulty = best.difficulty
      } else {
        entry.assigned = entry.cluster
        entry.assignedDifficulty = entry.difficulty
      }
    } else {
      entry.assigned = entry.cluster
      entry.assignedDifficulty = entry.difficulty
    }
    continue
  }

  const candidate = entry.candidates[entry.proposalIdx]
  entry.proposalIdx++

  if (reservedByEasy.has(candidate.result)) {
    unmatched.push(entry)
    continue
  }

  const currentHolder = slots.get(candidate.result)

  if (!currentHolder) {
    slots.set(candidate.result, entry)
    entry.assigned = candidate.result
    entry.assignedDifficulty = candidate.difficulty
  } else {
    const entryPri = priority(entry)
    const holderPri = priority(currentHolder)

    if (entryPri < holderPri) {
      slots.set(candidate.result, entry)
      entry.assigned = candidate.result
      entry.assignedDifficulty = candidate.difficulty
      currentHolder.assigned = ''
      unmatched.push(currentHolder)
    } else {
      unmatched.push(entry)
    }
  }
}

console.log(`Stable matching: ${iterations} iterations`)

// ─── Post-processing ─────────────────────────────────────────

/**
 * Cascading simplification. Never reduces below 2C.
 */

const VOICE_PAIRS: Record<string, string> = {
  p: 'b', t: 'd', k: 'g', s: 'z', f: 'v', c: 'C', x: 'j',
  b: 'p', d: 't', g: 'k', z: 's', v: 'f', C: 'c', j: 'x',
}
const VOICED_OBS = new Set(['b', 'd', 'g', 'z', 'v', 'C', 'j'])
const ALL_OBS = new Set(['b', 'd', 'g', 'p', 't', 'k', 's', 'z', 'f', 'v', 'c', 'C', 'x', 'j'])

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

function postProcess(output: string): string {
  let current = output
  let maxLoops = 5

  /** Only simplify if we can stay at 2C or above. */
  while (current.length > MIN_OUTPUT && clusterDifficulty(current) >= HARD_THRESHOLD && maxLoops > 0) {
    const reduced = simplifyOnce(current)
    if (reduced === current) break
    if (reduced.length < MIN_OUTPUT) break
    current = reduced
    maxLoops--
  }

  /** q at junction: drop q, keep the rest (q -> n in joining rules). */
  if (current.length >= 2 && current[0] === 'q') {
    current = current.slice(1)
    if (current.length < MIN_OUTPUT) current = 'qk'
  }

  /** Single q expands to qk (already 2C). */
  if (current === 'q') current = 'qk'

  /**
   * If we ended up at 1C somehow (shouldn't happen with new
   * candidate generation, but safety net), duplicate it to
   * form a geminate. Geminates are pronounceable.
   */
  if (current.length === 1) {
    current = current + current
  }

  /** Cap at max output length. Keep simplifying if too long. */
  while (current.length > MAX_OUTPUT) {
    const reduced = simplifyOnce(current)
    if (reduced === current || reduced.length < MIN_OUTPUT) break
    current = reduced
  }

  /** Voice-assimilate adjacent obstruents. */
  current = voiceAssimilateCluster(current)

  return current
}

// ─── Output ─────────────────────────────────────────────────

type Row = {
  cluster: string
  difficulty: number
  simplified: string
  simplifiedDifficulty: number
  changed: boolean
  source: string
  candidateCount: number
}

const simplifyLookup = new Map<string, SimplifyEntry>()
for (const h of allSimplifyEntries) {
  const key = `${h.cluster}:${h.source}`
  simplifyLookup.set(key, h)
}

const allRows: Row[] = []

for (const entry of allEntries) {
  const key = `${entry.cluster}:${entry.source}`
  const h = simplifyLookup.get(key)

  if (h) {
    const simplified = postProcess(h.assigned)
    allRows.push({
      cluster: h.cluster,
      difficulty: h.difficulty,
      simplified,
      simplifiedDifficulty: clusterDifficulty(simplified),
      changed: simplified !== h.cluster,
      source: h.source,
      candidateCount: h.candidates.length,
    })
  } else {
    const simplified = postProcess(entry.cluster)
    allRows.push({
      cluster: entry.cluster,
      difficulty: entry.difficulty,
      simplified,
      simplifiedDifficulty: clusterDifficulty(simplified),
      changed: simplified !== entry.cluster,
      source: entry.source,
      candidateCount: 0,
    })
  }
}

// ─── Write Files ────────────────────────────────────────────

const maxLen = Math.max(...allRows.map(r => r.cluster.length))

const tsvHeader = 'before\tafter'
const tsvLines = allRows.map(r => {
  const before = r.cluster.padEnd(maxLen)
  const after = r.changed ? r.simplified : r.cluster
  return `${before}\t${after}`
})

const tsvContent = [tsvHeader, ...tsvLines].join('\n') + '\n'
const tsvPath = resolve(TEXT_DIR, 'consonant-clusters-mapping.tsv')
writeFileSync(tsvPath, tsvContent)

const consonantRank = new Map(CONSONANT_ORDER.map((c, i) => [c, i]))

function clusterSortKey(cluster: string): number {
  let key = 0
  for (let i = 0; i < cluster.length; i++) {
    key = key * 100 + (consonantRank.get(cluster[i]) ?? 50)
  }
  return key
}

const outputs = [...new Set(allRows.map(r => r.simplified))].sort((a, b) => {
  if (b.length !== a.length) return b.length - a.length
  return clusterSortKey(a) - clusterSortKey(b)
})
const outputsTsvPath = resolve(TEXT_DIR, 'consonant-clusters-outputs.tsv')
writeFileSync(outputsTsvPath, outputs.join('\n') + '\n')

const csvHeader = 'cluster,difficulty,simplified,simplified_difficulty,changed,source,candidate_count'
const csvLines = allRows.map(r =>
  `${r.cluster},${r.difficulty},${r.simplified},${r.simplifiedDifficulty},${r.changed},${r.source},${r.candidateCount}`
)
const csvContent = [csvHeader, ...csvLines].join('\n') + '\n'
const csvPath = resolve(TEXT_DIR, 'consonant-clusters.csv')
writeFileSync(csvPath, csvContent)

const mappingObj: Record<string, string> = {}
for (const r of allRows) {
  /** Never store single-char keys. Junctions must be >= 2C. */
  if (r.cluster.length < MIN_OUTPUT) continue
  const simplified = r.changed ? r.simplified : r.cluster
  if (!mappingObj[r.cluster]) {
    mappingObj[r.cluster] = simplified
  }
}
const mappingJsonPath = resolve(TEXT_DIR, 'consonant-clusters-mapping.json')
writeFileSync(mappingJsonPath, JSON.stringify(mappingObj, null, 2) + '\n')

const changedCount = allRows.filter(r => r.changed).length
const unchangedCount = allRows.filter(r => !r.changed).length
const collisions = allRows
  .filter(r => r.changed)
  .map(r => r.simplified)
  .filter((v, i, arr) => arr.indexOf(v) !== i)

console.log(`Wrote ${allRows.length} rows to:`)
console.log(`  ${tsvPath}`)
console.log(`  ${outputsTsvPath} (${outputs.length} unique outputs)`)
console.log(`  ${csvPath}`)
console.log(`  ${mappingJsonPath}`)
console.log(`  changed: ${changedCount}, unchanged: ${unchangedCount}`)
console.log(`  collisions: ${collisions.length}`)

if (collisions.length > 0) {
  const unique = [...new Set(collisions)]
  console.log(`  colliding outputs: ${unique.join(', ')}`)
}

/** Verify no single-consonant outputs. */
const singleOutputs = allRows.filter(r => r.simplified.length < MIN_OUTPUT)
if (singleOutputs.length > 0) {
  console.warn(`WARNING: ${singleOutputs.length} outputs below ${MIN_OUTPUT}C minimum:`)
  for (const r of singleOutputs.slice(0, 10)) {
    console.warn(`  ${r.cluster} -> ${r.simplified}`)
  }
}
