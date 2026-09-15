/**
 * Word generation for 4 consonant set combinations.
 *
 * Combo 1: Stops/nasals start, fricatives/liquids end (exclusive)
 * Combo 2: Fricatives/liquids start, stops/nasals end (exclusive)
 * Combo 3: Stops/nasals both sides (overlapping)
 * Combo 4: Fricatives/liquids both sides (overlapping)
 *
 * Mid cycling (all combos):
 *   3-group exclusion: G0={s,j,b,l} G1={z,c,x,v} G2={C,f,h,p,r}
 *   Binary (mod 2): m↔n, d↔t, g↔k
 *   No w or y in mid or end positions.
 *
 * This is the generator as it stood before the split into tree, rock
 * and moon, recovered from commit eb8d83f. It is kept because it is
 * the only written statement of how `CVCVC` is allowed to be built:
 * the end cycling below is what decides which two syllable words
 * exist, and nothing since has replaced it.
 *
 * Writes `../base/unified/{3,5,7}.csv` and `../base/combo-{1,2,3,4}/`.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/moon/code/calculate.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const vowels = 'ieaou'.split('')

// ─── Exclusion Graph ────────────────────────────────────

const ALL_EXCLUSION_PAIRS: [string, string][] = [
  ['s', 'z'], ['s', 'f'], ['s', 'x'], ['s', 'c'], ['s', 'h'],
  ['f', 'v'], ['f', 'c'],
  ['x', 'j'], ['x', 'h'],
  ['c', 'C'],
  ['z', 'j'], ['z', 'C'],
  ['v', 'C'], ['v', 'b'],
  ['b', 'p'],
  ['j', 'C'],
  ['y', 'w'],
  ['m', 'n'], ['d', 't'], ['g', 'k'],
]

const exclusionEdges = new Set<string>()
for (const [a, b] of ALL_EXCLUSION_PAIRS) {
  exclusionEdges.add(`${a}-${b}`)
  exclusionEdges.add(`${b}-${a}`)
}

function areExclusive(a: string, b: string): boolean {
  return a === b || exclusionEdges.has(`${a}-${b}`)
}

// ─── 3-Group Exclusion (mid positions) ──────────────────

const exclusionGroups: [string[], string[], string[]] = [
  ['s', 'j', 'b', 'l'],   // G0 (y removed)
  ['z', 'c', 'x', 'v'],   // G1 (w removed)
  ['C', 'f', 'h', 'p', 'r'],
]

const midBinaryPairs: [string, string][] = [
  ['m', 'n'], ['d', 't'], ['g', 'k'],
]

const groupOf: Record<string, number> = {}
for (let gi = 0; gi < exclusionGroups.length; gi++) {
  for (const c of exclusionGroups[gi]) groupOf[c] = gi
}

const midBinaryIdx: Record<string, number> = {}
for (const [a, b] of midBinaryPairs) {
  midBinaryIdx[a] = 0
  midBinaryIdx[b] = 1
}

function availableByExclusion(pool: string[], groupPhase: number, binaryPhase: number): string[] {
  const p3 = ((groupPhase % 3) + 3) % 3
  const p2 = ((binaryPhase % 2) + 2) % 2
  return pool.filter(c => {
    if (c in groupOf) return groupOf[c] === p3
    if (c in midBinaryIdx) return midBinaryIdx[c] === p2
    return true
  })
}

// Mid pool: all consonants except w, y
const midPool = [
  's', 'z', 'f', 'v', 'x', 'j', 'c', 'C',
  'l', 'r', 'm', 'n', 'b', 'd', 'g', 'p',
  't', 'k', 'h',
]

// ─── Adjacent Consonant Constraint (CVCVC, CVCVCVC) ───
//
// Both stops/nasals: always allowed (even exclusion pairs like m-n, d-t).
// Both fricatives: only s-s, z-z, v-v, x-x allowed.
// Mixed or other: use exclusion graph.

const fricativeSet = new Set(['s', 'z', 'f', 'v', 'x', 'j', 'c', 'C'])
const stopNasalSet = new Set(['m', 'n', 'b', 'd', 'g', 'p', 't', 'k'])
const allowedFricPairs = new Set([
  's-s', 'z-z', 'v-v', 'x-x',
  's-f', 'f-s', 'v-z', 'z-v',
  'j-v', 'v-j', 'x-f', 'f-x',
  'c-s', 'C-z',
])

function adjacentOk(a: string, b: string): boolean {
  if (stopNasalSet.has(a) && stopNasalSet.has(b)) return true
  if (fricativeSet.has(a) && fricativeSet.has(b)) return allowedFricPairs.has(`${a}-${b}`)
  return !areExclusive(a, b)
}

// ─── Sort Order ─────────────────────────────────────────

const CHAR_ORDER = 'i e a o u m n q g d b p t k h s z v f x j C c y r l w'.split(' ')
const CHAR_RANK = new Map(CHAR_ORDER.map((c, i) => [c, i]))

function compareWords(a: string, b: string): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ra = CHAR_RANK.get(a[i]) ?? 99
    const rb = CHAR_RANK.get(b[i]) ?? 99
    if (ra !== rb) return ra - rb
  }
  return 0
}

function sortChars(arr: string[]): string[] {
  return [...arr].sort((a, b) => (CHAR_RANK.get(a) ?? 99) - (CHAR_RANK.get(b) ?? 99))
}

// ─── EndMap ─────────────────────────────────────────────

type EndMap = Map<string, string[]>

function sortEndMap(map: EndMap): EndMap {
  const sorted = new Map<string, string[]>()
  for (const [key, ends] of map) {
    sorted.set(key, [...ends].sort((a, b) => (CHAR_RANK.get(a) ?? 99) - (CHAR_RANK.get(b) ?? 99)))
  }
  return sorted
}

// ─── Combo 1: 4-Phase End Cycling ──────────────────────
//
// Pairs: P1=(s,z), P2=(j,x), P3=(f,v), P4=(C,c)
// Unpaired: q, l, r
// Phase = si % 4. Rotates which pair group leads.

const combo1Phases: string[][][] = [
  [['s','j'], ['v','c','q'], ['f','C','l'], ['z','x','q','r'], ['f','C','l']],
  [['z','x','q'], ['f','C'], ['v','c','q','r'], ['s','j','l'], ['v','c','q','r']],
  [['f','C'], ['z','x','q'], ['s','j','l'], ['v','c','q','r'], ['s','j','l']],
  [['v','c','q'], ['s','j'], ['v','c','q','r'], ['f','C','l'], ['z','x','q','r']],
]

function generateCombo1EndMap(numStarts: number): EndMap {
  const map: EndMap = new Map()
  for (let si = 0; si < numStarts; si++) {
    const phase = si % 4
    for (let vi = 0; vi < 5; vi++) {
      map.set(`${si}-${vi}`, combo1Phases[phase][vi])
    }
  }
  return map
}

// ─── Combo 2: Weaving End Pattern ──────────────────────
//
// Stop/nasal ends. Two binary pair groups cycle with (si + vi) % 2.
//   Group A: [m, p, d, k]   Group B: [n, b, t, g]
// Four weaving patterns select 2 of 4 positions.
// Pattern index = (si + vi + floor(si/4)*2) % 4

function generateCombo2EndMap(numStarts: number): EndMap {
  const pairGroupA = ['m', 'p', 'd', 'k']
  const pairGroupB = ['n', 'b', 't', 'g']
  const patterns: number[][] = [
    [0, 2], // +-+-
    [2, 3], // --++
    [1, 3], // -+-+
    [0, 1], // ++--
  ]
  const map: EndMap = new Map()
  for (let si = 0; si < numStarts; si++) {
    for (let vi = 0; vi < 5; vi++) {
      const pool = (si + vi) % 2 === 0 ? pairGroupA : pairGroupB
      const groupOffset = Math.floor(si / 4) * 2
      const patternIdx = (si + vi + groupOffset) % 4
      map.set(`${si}-${vi}`, patterns[patternIdx].map(pos => pool[pos]))
    }
  }
  return map
}

// ─── Structured Matching (Combos 3, 4) ─────────────────
//
// 4 binary pairs forming 9 derangement-based perfect matchings.
// Each (start, vowel) cell gets 1 from sideA + 1 from sideB.
// One pair doubled at two vowels. All 8 consonants covered per start.

function rotateRight<T>(arr: T[], n: number): T[] {
  const len = arr.length
  const shift = ((n % len) + len) % len
  return [...arr.slice(len - shift), ...arr.slice(0, len - shift)]
}

function matchingOverlap(a: [string, string][], b: [string, string][]): number {
  const setA = new Set(a.map(([x, y]) => `${x}-${y}`))
  let count = 0
  for (const [x, y] of b) {
    if (setA.has(`${x}-${y}`)) count++
  }
  return count
}

function generateStructuredEndMap(input: {
  numStarts: number
  sideABase: string[]
  matchings: [string, string][][]
  extras?: { char: string, eligibleVowels: number[] }[]
}): EndMap {
  const { numStarts, sideABase, matchings, extras = [] } = input
  const map: EndMap = new Map()
  const usedMatchings: [string, string][][] = []
  const doubledPairs = new Set<string>()

  for (let si = 0; si < numStarts; si++) {
    const rotated = rotateRight(sideABase, si % sideABase.length)

    let bestM = matchings[0]
    let bestScore = -Infinity
    for (const m of matchings) {
      const maxOverlap = usedMatchings.length === 0 ? 0 :
        Math.max(...usedMatchings.map(um => matchingOverlap(um, m)))
      const novelCount = m.filter(([a, b]) =>
        !doubledPairs.has(`${a}-${b}`)
      ).length
      const score = -maxOverlap * 10 + novelCount
      if (score > bestScore) {
        bestScore = score
        bestM = m
      }
    }
    usedMatchings.push(bestM)

    const pairMap = new Map<string, string>()
    for (const [a, b] of bestM) pairMap.set(a, b)

    const preferIdx = (si + 1) % sideABase.length
    const preferA = rotated[preferIdx]
    const preferKey = `${preferA}-${pairMap.get(preferA)}`

    let doubleA: string
    if (!doubledPairs.has(preferKey)) {
      doubleA = preferA
    } else {
      const novel = rotated.find(a =>
        !doubledPairs.has(`${a}-${pairMap.get(a)}`)
      )
      doubleA = novel ?? preferA
    }
    doubledPairs.add(`${doubleA}-${pairMap.get(doubleA)}`)

    const d1 = (si + 1) % 5
    const d2 = (si + 3) % 5
    const doubleRotIdx = rotated.indexOf(doubleA)
    const nonDoubleA = rotated.filter((_, i) => i !== doubleRotIdx)
    const nonDoubleVowels = [0, 1, 2, 3, 4].filter(v => v !== d1 && v !== d2)

    const cells: string[][] = [[], [], [], [], []]
    cells[d1] = [doubleA, pairMap.get(doubleA)!]
    cells[d2] = [doubleA, pairMap.get(doubleA)!]
    for (let i = 0; i < nonDoubleA.length; i++) {
      const a = nonDoubleA[i]
      cells[nonDoubleVowels[i]] = [a, pairMap.get(a)!]
    }

    if (extras.length > 0) {
      const extraUsage: Record<string, number> = {}
      for (const e of extras) extraUsage[e.char] = 0
      for (const vi of [0, 2, 3, 4]) {
        const eligible = extras
          .filter(e => e.eligibleVowels.includes(vi))
          .map(e => e.char)
        if (eligible.length === 0) continue
        eligible.sort((a, b) => extraUsage[a] - extraUsage[b])
        cells[vi].push(eligible[0])
        extraUsage[eligible[0]]++
      }
    }

    for (let vi = 0; vi < 5; vi++) {
      map.set(`${si}-${vi}`, cells[vi])
    }
  }

  return map
}

// Combo 3: stop/nasal derangements (m,p,d,k ↔ n,b,t,g)
const B_SIDE_A = ['m', 'p', 'd', 'k']
const B_MATCHINGS: [string, string][][] = [
  [['m','b'], ['p','t'], ['d','g'], ['k','n']],
  [['m','t'], ['p','g'], ['d','n'], ['k','b']],
  [['m','g'], ['p','t'], ['d','b'], ['k','n']],
  [['m','b'], ['p','n'], ['d','g'], ['k','t']],
  [['m','t'], ['p','g'], ['d','b'], ['k','n']],
  [['m','b'], ['p','g'], ['d','n'], ['k','t']],
  [['m','g'], ['p','n'], ['d','b'], ['k','t']],
  [['m','t'], ['p','n'], ['d','g'], ['k','b']],
  [['m','g'], ['p','t'], ['d','n'], ['k','b']],
]

// Combo 4: voiceless↔voiced fricative derangements (x,s,c,f ↔ z,v,j,C)
const C_SIDE_A = ['x', 's', 'c', 'f']
const C_MATCHINGS: [string, string][][] = [
  [['s','v'], ['f','C'], ['x','z'], ['c','j']],
  [['s','j'], ['f','z'], ['x','C'], ['c','v']],
  [['s','C'], ['f','j'], ['x','v'], ['c','z']],
  [['s','v'], ['f','z'], ['x','C'], ['c','j']],
  [['s','j'], ['f','C'], ['x','z'], ['c','v']],
  [['s','v'], ['f','j'], ['x','C'], ['c','z']],
  [['s','C'], ['f','z'], ['x','v'], ['c','j']],
  [['s','j'], ['f','C'], ['x','v'], ['c','z']],
  [['s','C'], ['f','j'], ['x','z'], ['c','v']],
]

// Combo 4: hardcoded end assignments for 8 fricative starts
const combo4Hardcoded: string[][][] = [
  // s- double (s,v)
  [['q','z','x'], ['s','v'], ['q','c','j'], ['s','v','l'], ['f','C','r']],
  // z- double (s,j) — swapped e↔a for CVCVC variety
  [['f','z'], ['s','j','l'], ['x','C'], ['c','v','r'], ['q','s','j','l']],
  // v- double (x,z)
  [['q','x','z'], ['c','v'], ['q','j','s'], ['C','f','l'], ['x','z','r']],
  // f- double (x,C) — swapped e↔a for CVCVC variety
  [['c','v'], ['x','C','l'], ['s','j'], ['f','z','r'], ['q','x','C','l']],
  // x- double (c,v)
  [['c','v'], ['j','f'], ['C','s','l'], ['x','z','r'], ['q','c','v','r']],
  // j- double (c,j) — swapped e↔a for CVCVC variety
  [['q','f','C'], ['c','j'], ['q','x','z'], ['s','v','l'], ['c','j','r']],
  // C- double (f,z) — swapped e↔a for CVCVC variety
  [['s','j'], ['f','z','l'], ['c','j'], ['C','s','r'], ['q','f','z','l']],
  // c- double (f,C)
  [['q','f','C'], ['x','z'], ['q','s','j'], ['c','v','l'], ['f','C','r']],
]

// ─── Config ─────────────────────────────────────────────

type ComboConfig = {
  name: string
  starts: string[]
  ends: string[]
  endMap: EndMap
  badTails: Set<string>
  bannedVC: Set<string>
  bannedCV: Set<string>
  overlapping: boolean
}

function getEnds(cfg: ComboConfig, si: number, vi: number): string[] {
  return cfg.endMap.get(`${si}-${vi}`) ?? []
}

// CVCVC and CVCVCVC: ends cycle based on mid consonant index
// Each (si + v1i + midIdx + v2i) phase picks a different subset of ends.
// Paired ends rotate: each phase gets one from each pair.
// This ensures no end repeats across v2 for the same (start, v1, mid).

// Fricative cycle: s v j c f z C x (length 8)
// Each phase picks 3 consecutive from this ring.
const fricCycle = ['s', 'v', 'j', 'c', 'z', 'x', 'C', 'f']

// Stop/nasal cycle for combos 2/3: m p d k n b t g (length 8)
const stopCycle = ['m', 'p', 'd', 'k', 'n', 'b', 't', 'g']

// Unpaired cycle: q r l (length 3)
// Phase 0: q on i/a, r on o, l on u
// Phase 1: r on a/o, l on u, q on i  (shifted)
// Basically: rotate which vowels get which unpaired
const unpairedCycle = ['q', 'r', 'l']
const unpairedVowelSlots: number[][] = [
  [0, 2],  // slot 0: vowels i, a
  [3],     // slot 1: vowel o
  [4],     // slot 2: vowel u
]

function getEndsCycled(cfg: ComboConfig, step: number, v2i: number): string[] {
  const result: string[] = []

  // Pick which cycle to use based on what's in the end set
  const cycle = cfg.ends.includes('s') ? fricCycle : stopCycle
  const available = cycle.filter(c => cfg.ends.includes(c))

  // Walk the ring: each step advances by 3, pick 3 consecutive
  const len = available.length
  const offset = (step * 3) % len
  for (let i = 0; i < 3; i++) {
    result.push(available[(offset + i) % len])
  }

  // Unpaired: rotate assignment by step
  const uPhase = ((step % 3) + 3) % 3
  for (let si = 0; si < unpairedVowelSlots.length; si++) {
    const u = unpairedCycle[(si + uPhase) % 3]
    if (cfg.ends.includes(u) && unpairedVowelSlots[si].includes(v2i)) {
      result.push(u)
    }
  }

  return result
}

// Step counter: each (si, v1i, midIdx, v2i) combo is one step
function getEndStep(si: number, v1i: number, midIdx: number, v2i: number): number {
  return si * 100 + v1i * 20 + midIdx * 5 + v2i
}

function getEndsCVCVC(cfg: ComboConfig, si: number, v1i: number, v2i: number, midIdx: number): string[] {
  return getEndsCycled(cfg, getEndStep(si, v1i, midIdx, v2i), v2i)
}

function getEndsCVCVCVC(cfg: ComboConfig, si: number, v1i: number, v2i: number, v3i: number, mid2Idx: number): string[] {
  return getEndsCycled(cfg, getEndStep(si, v1i + v2i, mid2Idx, v3i), v3i)
}

// ─── Build Configs ──────────────────────────────────────

const combo1Starts = ['m', 'n', 'b', 'd', 'g', 'p', 't', 'k', 'h', 'y', 'w']
const combo2Starts = ['s', 'z', 'v', 'f', 'x', 'j', 'C', 'c', 'r', 'l']
const combo3Starts = ['m', 'n', 'b', 'd', 'g', 'p', 't', 'k', 'h', 'y', 'w']
const combo4Starts = ['s', 'z', 'v', 'f', 'x', 'j', 'C', 'c', 'r', 'l']

const endMap1 = sortEndMap(generateCombo1EndMap(combo1Starts.length))
const endMap2 = sortEndMap(generateCombo2EndMap(combo2Starts.length))
const endMap3 = sortEndMap(generateStructuredEndMap({
  numStarts: combo3Starts.length,
  sideABase: B_SIDE_A,
  matchings: B_MATCHINGS,
}))

// Combo 4: hardcoded for 8 fricatives, generated for r, l
const endMap4Raw: EndMap = new Map()
for (let si = 0; si < combo4Hardcoded.length; si++) {
  for (let vi = 0; vi < 5; vi++) {
    endMap4Raw.set(`${si}-${vi}`, combo4Hardcoded[si][vi])
  }
}
const endMap4Tail = generateStructuredEndMap({
  numStarts: 2,
  sideABase: C_SIDE_A,
  matchings: C_MATCHINGS,
  extras: [
    { char: 'q', eligibleVowels: [0, 2, 4] },
    { char: 'l', eligibleVowels: [2, 3, 4] },
    { char: 'r', eligibleVowels: [2, 3, 4] },
  ],
})
for (let si = 0; si < 2; si++) {
  for (let vi = 0; vi < 5; vi++) {
    endMap4Raw.set(`${si + 8}-${vi}`, endMap4Tail.get(`${si}-${vi}`) ?? [])
  }
}
const endMap4 = sortEndMap(endMap4Raw)

// el/il/er/ir allowed in middle positions, only banned at end (via badTails)
const bannedVC = new Set<string>()
const bannedCV = new Set(['yi', 'wu', 'wo', 'ye', 'wa', 'we'])

const combo1: ComboConfig = {
  name: '1',
  starts: combo1Starts,
  ends: sortChars(['q', 's', 'z', 'f', 'v', 'x', 'j', 'c', 'C', 'l', 'r']),
  endMap: endMap1,
  badTails: new Set(['el', 'il', 'er', 'ir']),
  bannedVC,
  bannedCV,
  overlapping: false,
}

const combo2: ComboConfig = {
  name: '2',
  starts: combo2Starts,
  ends: sortChars(['m', 'n', 'b', 'd', 'g', 'p', 't', 'k']),
  endMap: endMap2,
  badTails: new Set([]),
  bannedVC,
  bannedCV,
  overlapping: false,
}

const combo3: ComboConfig = {
  name: '3',
  starts: combo3Starts,
  ends: sortChars(['m', 'n', 'b', 'd', 'g', 'p', 't', 'k']),
  endMap: endMap3,
  badTails: new Set([]),
  bannedVC,
  bannedCV,
  overlapping: true,
}

const combo4: ComboConfig = {
  name: '4',
  starts: combo4Starts,
  ends: sortChars(['q', 's', 'z', 'f', 'v', 'x', 'j', 'c', 'C', 'l', 'r']),
  endMap: endMap4,
  badTails: new Set(['el', 'il', 'er', 'ir']),
  bannedVC,
  bannedCV,
  overlapping: true,
}

// ─── CVC Generation ────────────────────────────────────

function generateCVC(cfg: ComboConfig): string[] {
  const words: string[] = []
  for (let si = 0; si < cfg.starts.length; si++) {
    const c1 = cfg.starts[si]
    for (let vi = 0; vi < vowels.length; vi++) {
      const v = vowels[vi]
      if (cfg.bannedCV.has(c1 + v)) continue
      for (const c2 of getEnds(cfg, si, vi)) {
        if (!cfg.badTails.has(v + c2)) {
          words.push(c1 + v + c2)
        }
      }
    }
  }
  return words.sort(compareWords)
}

// ─── Unified CVC Generation ─────────────────────────────

function generateCVC_unified(): string[] {
  const words: string[] = []
  let endACursor = 0
  let endBCursor = 0
  let endCCursor = 0
  let endDCursor = 0
  let endEOn = false // q: off first

  for (const c1 of ALL_CONSONANTS) {
    for (let vi = 0; vi < vowels.length; vi++) {
      const v = vowels[vi]
      if (bannedCV.has(c1 + v)) continue

      const ends: string[] = []

      const aGroup = END_A[endACursor % END_A.length]
      for (const e of aGroup) ends.push(e)
      endACursor++

      const bGroup = END_B[endBCursor % END_B.length]
      for (const e of bGroup) ends.push(e)
      endBCursor++

      ends.push(END_C[endCCursor % END_C.length])
      endCCursor++

      ends.push(END_D[endDCursor % END_D.length])
      endDCursor++

      if (endEOn) ends.push('q')
      endEOn = !endEOn

      for (const c2 of ends) {
        if (c2 === 'h' || c2 === 'w' || c2 === 'y') continue
        if (badTailsUnified.has(v + c2)) continue
        if (c1 === c2) continue // no same start and end
        const cCcount = [c1, c2].filter(x => x === 'c' || x === 'C').length
        if (cCcount > 1) continue
        words.push(c1 + v + c2)
      }
    }
  }
  return words.sort(compareWords)
}

// ─── Global-Cursor CVCVC Generation ────────────────────

type MidRingConfig = {
  ring: string[]
  lrAlternating?: boolean   // l/r with al/or alternating pattern
  hwyRestricted?: boolean   // h→only before u, w→only before i, y→only before a
}

type EndSpecials = {
  qlr?: boolean  // q/l/r alternating vowel patterns
}

type CyclingConfig = {
  startOrder: string[]
  midRings: MidRingConfig[]
  endRing: string[]
  endSpecials: EndSpecials
}

function pull3(ring: string[], cursor: number): { items: string[], next: number } {
  const len = ring.length
  const items = [
    ring[cursor % len],
    ring[(cursor + 1) % len],
    ring[(cursor + 2) % len],
  ]
  return { items, next: cursor + 3 }
}

const cyclingConfigs: Record<string, CyclingConfig> = {
  '1': {
    startOrder: ['m', 'y', 'g', 'd', 'b', 'h', 'n', 'w', 'p', 't', 'k'],
    midRings: [
      { ring: ['f', 'C', 'x', 's', 'v', 'j', 'c', 'z'], lrAlternating: true },
      { ring: ['m', 'g', 'd', 'b', 'n', 'k', 'p', 't'], hwyRestricted: true },
    ],
    endRing: ['s', 'v', 'j', 'c', 'z', 'f', 'C', 'x'],
    endSpecials: { qlr: true },
  },
  '2': {
    startOrder: ['s', 'v', 'j', 'c', 'z', 'f', 'C', 'x', 'r', 'l'],
    midRings: [
      { ring: ['c', 'z', 'f', 'C', 'x', 's', 'v', 'j'], lrAlternating: true },
      { ring: ['t', 'k', 'm', 'n', 'b', 'd', 'g', 'p'], hwyRestricted: true },
    ],
    endRing: ['d', 'g', 'p', 't', 'k', 'm', 'n', 'b'],
    endSpecials: {},
  },
  '3': {
    startOrder: ['m', 'y', 'g', 'd', 'b', 'h', 'n', 'w', 'p', 't', 'k'],
    midRings: [
      { ring: ['C', 'x', 's', 'v', 'j', 'c', 'z', 'f'], lrAlternating: true },
      { ring: ['b', 'd', 'g', 'p', 't', 'k', 'm', 'n'], hwyRestricted: true },
    ],
    endRing: ['p', 't', 'k', 'm', 'n', 'b', 'd', 'g'],
    endSpecials: {},
  },
  '4': {
    startOrder: ['s', 'v', 'j', 'c', 'z', 'f', 'C', 'x', 'r', 'l'],
    midRings: [
      { ring: ['z', 'f', 'C', 'x', 's', 'v', 'j', 'c'], lrAlternating: true },
      { ring: ['t', 'k', 'm', 'n', 'b', 'd', 'g', 'p'], hwyRestricted: true },
    ],
    endRing: ['j', 'c', 'z', 'f', 'C', 'x', 's', 'v'],
    endSpecials: { qlr: true },
  },
}

// ─── Unified CVCVC Generator ────────────────────────────
//
// C1: all consonants
// V1: i e a o u
// C3 (mid): all consonants
// V2: i e a o u
// C5 (end): 5 independent sub-cycles covering all valid ends
//
// No h/w/y at end. bannedCV and badTails still apply.

const ALL_CONSONANTS = ['m', 'n', 'g', 'd', 'b', 'p', 't', 'k', 'h', 's', 'z', 'v', 'f', 'x', 'j', 'C', 'c', 'y', 'r', 'l', 'w']

// End sub-cycles (5 independent global cursors)
const END_A = [  // fricatives: cycle of 4, pairs of 2
  ['s', 'v'],
  ['x', 'C'],
  ['z', 'f'],
  ['c', 'j'],
]
const END_B = [  // stops: cycle of 6, singles
  ['p'],
  ['d'],
  ['k'],
  ['b'],
  ['g'],
  ['t'],
]
const END_C = ['n', 'm']  // nasals: cycle of 2
const END_D = ['l', 'r']  // liquids: cycle of 2
// E: q on/off

const badTailsUnified = new Set(['el', 'il', 'er', 'ir'])

function generateCVCVC_unified(): string[] {
  const words: string[] = []
  let v4Offset = 0

  for (const c1 of ALL_CONSONANTS) {
    for (let v1i = 0; v1i < vowels.length; v1i++) {
      const v1 = vowels[v1i]
      if (bannedCV.has(c1 + v1)) continue

      for (let v2i = 0; v2i < vowels.length; v2i++) {
        if (v1i === v2i && (v1i === 0 || v1i === 1 || v1i === 4)) continue // no i-i, e-e, u-u
        const v2 = vowels[v2i]

        // End cycling resets at each V4, but with incrementing offset
        let endACursor = v4Offset
        let endBCursor = v4Offset
        let endCCursor = v4Offset
        let endDCursor = v4Offset
        let endEOn = v4Offset % 2 === 1  // q: off first, then on
        v4Offset++

        // For this V4, loop through all C3 mids
        for (const cm of ALL_CONSONANTS) {
          if (bannedVC.has(v1 + cm)) continue
          if (bannedCV.has(cm + v2)) continue

          // Collect ends from all 5 sub-cycles
          const ends: string[] = []

          // A: fricative cycle of 6
          const aGroup = END_A[endACursor % END_A.length]
          for (const e of aGroup) ends.push(e)
          endACursor++

          // B: stop cycle of 4
          const bGroup = END_B[endBCursor % END_B.length]
          for (const e of bGroup) ends.push(e)
          endBCursor++

          // C: nasal cycle of 3 (m, n, skip)
          const cVal = END_C[endCCursor % END_C.length]
          if (cVal) ends.push(cVal)
          endCCursor++

          // D: liquid cycle of 2
          ends.push(END_D[endDCursor % END_D.length])
          endDCursor++

          // E: q off/on
          if (endEOn) ends.push('q')
          endEOn = !endEOn


          for (const c2 of ends) {
            // No h/w/y at end
            if (c2 === 'h' || c2 === 'w' || c2 === 'y') continue
            if (badTailsUnified.has(v2 + c2)) continue
            if (c1 === cm && cm === c2) continue
            const cCcount = [c1, cm, c2].filter(x => x === 'c' || x === 'C').length
            if (cCcount > 1) continue
            words.push(c1 + v1 + cm + v2 + c2)
          }
        }
      }
    }
  }

  return words.sort(compareWords)
}

// ─── Generic cycling CVCVC (combos 1, 3, 4) ────────────

function generateCVCVC_cycling(cfg: ComboConfig): string[] {
  const cc = cyclingConfigs[cfg.name]
  if (!cc) throw new Error(`No cycling config for combo ${cfg.name}`)

  const words: string[] = []
  const midCursors = cc.midRings.map(() => 0)
  let endCursor = 0
  let specialMidToggle = 0
  let specialEndToggle = 0

  for (const c1 of cc.startOrder) {
    for (let v1i = 0; v1i < vowels.length; v1i++) {
      const v1 = vowels[v1i]
      if (cfg.bannedCV.has(c1 + v1)) continue

      for (let ri = 0; ri < cc.midRings.length; ri++) {
        const midRing = cc.midRings[ri]

        // Pull 3 from this mid ring
        const m = pull3(midRing.ring, midCursors[ri])
        midCursors[ri] = m.next
        const mids = [...m.items]

        // Special mids: l/r alternate across all vowels in mid position
        if (midRing.lrAlternating) {
          const lrPat = specialMidToggle % 2
          if (lrPat === 0) {
            mids.push('l')
            if (v1i % 2 === 1) mids.push('r')
          } else {
            mids.push('r')
            if (v1i % 2 === 1) mids.push('l')
          }
          specialMidToggle++
        }

        // Special mids: h/w/y restricted
        if (midRing.hwyRestricted) {
          mids.push('h', 'w', 'y')
        }

        for (const cm of mids) {
          if (!adjacentOk(c1, cm)) continue
          if (cfg.bannedVC.has(v1 + cm)) continue

          for (let v2i = 0; v2i < vowels.length; v2i++) {
            if (v1i === v2i && (v1i === 0 || v1i === 1 || v1i === 4)) continue // no i-i, e-e, u-u
            const v2 = vowels[v2i]
            if (cfg.bannedCV.has(cm + v2)) continue

            // h/w/y vowel restrictions
            if (midRing.hwyRestricted) {
              if (cm === 'h' && v2i !== 4) continue  // h only before u
              if (cm === 'w' && v2i !== 0) continue  // w only before i
              if (cm === 'y' && v2i !== 2) continue  // y only before a
            }

            // Pull 3 ends from ring
            const e = pull3(cc.endRing, endCursor)
            endCursor = e.next
            const ends = [...e.items]

            // Special ends: q/l/r 4-phase cycling
            if (cc.endSpecials.qlr) {
              const ePat = specialEndToggle % 4
              if (ePat === 0) {
                if (v2i === 2) ends.push('l')  // a
                if (v2i === 3) ends.push('r')  // o
              } else if (ePat === 1) {
                if (v2i === 2) ends.push('q')  // a
                if (v2i === 3) ends.push('l')  // o
                if (v2i === 4) ends.push('r')  // u
              } else if (ePat === 2) {
                if (v2i === 2) ends.push('r')  // a
                if (v2i === 3) ends.push('l')  // o
              } else {
                if (v2i === 2) ends.push('q')  // a
                if (v2i === 3) ends.push('r')  // o
                if (v2i === 4) ends.push('l')  // u
              }
              specialEndToggle++
            }

            for (const c2 of ends) {
              if (!cfg.ends.includes(c2)) continue
              if (!adjacentOk(cm, c2)) continue
              if (cfg.badTails.has(v2 + c2)) continue
              // No 3 same character in a row
              if (c1 === cm && cm === c2) continue
              // No 3 fricatives in a row
              if (fricativeSet.has(c1) && fricativeSet.has(cm) && fricativeSet.has(c2)) continue
              // Max 1 c/C total
              const cCcount = [c1, cm, c2].filter(x => x === 'c' || x === 'C').length
              if (cCcount > 1) continue
              words.push(c1 + v1 + cm + v2 + c2)
            }
          }
        }
      }
    }
  }

  return words.sort(compareWords)
}

// ─── Unified CVCVCVC Generation ─────────────────────────

function generateCVCVCVC_unified(): string[] {
  const words: string[] = []
  let v3Offset = 0

  for (const c1 of ALL_CONSONANTS) {
    for (let v1i = 0; v1i < vowels.length; v1i++) {
      const v1 = vowels[v1i]
      if (bannedCV.has(c1 + v1)) continue

      for (const cm1 of ALL_CONSONANTS) {
        if (bannedVC.has(v1 + cm1)) continue

        for (let v2i = 0; v2i < vowels.length; v2i++) {
          if (v1i === v2i && (v1i === 0 || v1i === 1 || v1i === 4)) continue
          const v2 = vowels[v2i]
          if (bannedCV.has(cm1 + v2)) continue

          for (const cm2 of ALL_CONSONANTS) {
            if (bannedVC.has(v2 + cm2)) continue

            // No 3 same character in a row
            if (c1 === cm1 && cm1 === cm2) continue
            // No 3 fricatives in a row
            if (fricativeSet.has(c1) && fricativeSet.has(cm1) && fricativeSet.has(cm2)) continue
            // Max 1 c/C total so far
            if ([c1, cm1, cm2].filter(x => x === 'c' || x === 'C').length > 1) continue

            for (let v3i = 0; v3i < vowels.length; v3i++) {
              if (v2i === v3i && (v2i === 0 || v2i === 1 || v2i === 4)) continue
              const v3 = vowels[v3i]
              // Must contain at least one 'a'
              if (v1i !== 2 && v2i !== 2 && v3i !== 2) continue
              if (bannedCV.has(cm2 + v3)) continue

              // End cycling resets per V3 with offset
              let endACursor = v3Offset
              let endBCursor = v3Offset
              let endCCursor = v3Offset
              let endDCursor = v3Offset
              let endEOn = v3Offset % 2 === 1
              v3Offset++

              // Collect ends from 5 sub-cycles
              const ends: string[] = []

              // A: fricative cycle of 4
              const aGroup = END_A[endACursor % END_A.length]
              for (const e of aGroup) ends.push(e)

              // B: stop cycle of 6
              const bGroup = END_B[endBCursor % END_B.length]
              for (const e of bGroup) ends.push(e)

              // C: nasal cycle of 2
              ends.push(END_C[endCCursor % END_C.length])

              // D: liquid cycle of 2
              ends.push(END_D[endDCursor % END_D.length])

              // E: q off/on
              if (endEOn) ends.push('q')

              for (const c2 of ends) {
                if (c2 === 'h' || c2 === 'w' || c2 === 'y') continue
                if (badTailsUnified.has(v3 + c2)) continue
                // No 3 same character
                if (cm1 === cm2 && cm2 === c2) continue
                // No 3 fricatives in a row
                if (fricativeSet.has(cm1) && fricativeSet.has(cm2) && fricativeSet.has(c2)) continue
                // Max 1 c/C total
                if ([c1, cm1, cm2, c2].filter(x => x === 'c' || x === 'C').length > 1) continue
                // Max 3 fricatives total
                if ([c1, cm1, cm2, c2].filter(x => fricativeSet.has(x)).length > 3) continue
                words.push(c1 + v1 + cm1 + v2 + cm2 + v3 + c2)
              }
            }
          }
        }
      }
    }
  }
  return words.sort(compareWords)
}

// ─── Join Logic ────────────────────────────────────────

const voicedObs = new Set(['b', 'd', 'g', 'z', 'v', 'j', 'C'])
const voicelessObs = new Set(['p', 't', 'k', 's', 'f', 'x', 'c'])

function validJoinChars(last: string, first: string): boolean {
  // Same letter
  if (last === first) return false
  // No h as start of joined word
  if (first === 'h') return false
  // Voicing pair
  if (allPairs[last] === first) return false
  // Any two from fricative set
  if (fricativeSet.has(last) && fricativeSet.has(first)) return false
  // Obstruent voicing agreement (stops + fricatives must match voicing)
  if (voicedObs.has(last) && voicelessObs.has(first)) return false
  if (voicelessObs.has(last) && voicedObs.has(first)) return false
  // No lm, ln
  if (last === 'l' && (first === 'm' || first === 'n')) return false
  // Exclude dy, ty, ry
  if (first === 'y' && (last === 'd' || last === 't' || last === 'r')) return false
  return true
}

function validJoinPair(w1: string, w2: string): boolean {
  return validJoinChars(w1[w1.length - 1], w2[0])
}

// Unordered 2-word joins: count {w1, w2} where w1 ≠ w2
// and at least one of w1→w2 or w2→w1 is a valid join.
function countJoinsUnordered(words: string[]): number {
  let count = 0
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (validJoinPair(words[i], words[j]) || validJoinPair(words[j], words[i])) {
        count++
      }
    }
  }
  return count
}

// Unordered cross-size joins: count {w1, w2} where w1 ∈ set1, w2 ∈ set2
// and at least one direction is a valid join.
function countCrossJoinsUnordered(words1: string[], words2: string[]): number {
  let count = 0
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (validJoinPair(w1, w2) || validJoinPair(w2, w1)) {
        count++
      }
    }
  }
  return count
}

// Unordered 3-word joins: count {w1, w2, w3} (all distinct)
// where at least one of the 6 orderings forms a valid join chain.
function count3WordJoinsUnordered(words: string[]): number {
  const n = words.length
  // Precompute join matrix for fast lookup
  const matrix = new Uint8Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && validJoinPair(words[i], words[j])) {
        matrix[i * n + j] = 1
      }
    }
  }

  let count = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        // Check all 6 orderings: ijk, ikj, jik, jki, kij, kji
        if (
          (matrix[i * n + j] && matrix[j * n + k]) ||
          (matrix[i * n + k] && matrix[k * n + j]) ||
          (matrix[j * n + i] && matrix[i * n + k]) ||
          (matrix[j * n + k] && matrix[k * n + i]) ||
          (matrix[k * n + i] && matrix[i * n + j]) ||
          (matrix[k * n + j] && matrix[j * n + i])
        ) {
          count++
        }
      }
    }
  }
  return count
}

function generate2WordJoins(words: string[]): string[] {
  const results: string[] = []
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (validJoinPair(words[i], words[j])) results.push(words[i] + words[j])
      if (validJoinPair(words[j], words[i])) results.push(words[j] + words[i])
    }
  }
  return results
}

// ─── CVCVCVC Hamming Distance Blocking ─────────────────

const allPairs: Record<string, string> = {
  m: 'n', n: 'm', b: 'p', p: 'b', d: 't', t: 'd', g: 'k', k: 'g',
  s: 'z', z: 's', f: 'v', v: 'f', x: 'j', j: 'x', c: 'C', C: 'c',
}

function blockCVCVCVC(words: string[], cfg: ComboConfig): string[] {
  // End position: strict confusable (more pairs = harder to be "different")
  // Stops: {b,d,g}, {b,p}, {p,t,k}, {d,t}, {g,k}
  // Fricatives: s-c, s-z, j-C, j-z, c-x, s-f, f-c
  const confusableEnd = new Set([
    'b-d', 'd-b', 'b-g', 'g-b', 'd-g', 'g-d',
    'b-p', 'p-b',
    'p-t', 't-p', 'p-k', 'k-p', 't-k', 'k-t',
    'd-t', 't-d', 'g-k', 'k-g',
    's-c', 'c-s', 's-z', 'z-s', 'j-C', 'C-j', 'j-z', 'z-j',
    'c-x', 'x-c', 's-f', 'f-s', 'f-c', 'c-f',
  ])

  // Start/mid positions: loose confusable (fewer pairs = easier to be "different")
  // Stops: b↔p, d↔t, g↔k
  // Fricatives: s↔c, s↔z, j↔C, j↔z, f↔c
  const confusableMid = new Set([
    'b-p', 'p-b', 'd-t', 't-d', 'g-k', 'k-g',
    's-c', 'c-s', 's-z', 'z-s', 'j-C', 'C-j', 'j-z', 'z-j', 'f-c', 'c-f',
  ])

  // Start/mid confusable pairs
  const confusStartMid = new Set([
    's-z', 'z-s', 'c-C', 'C-c', 'f-v', 'v-f', 'x-j', 'j-x',
    'd-t', 't-d', 'g-k', 'k-g', 'b-p', 'p-b', 'v-b', 'b-v',
  ])

  // End confusable pairs: all pairs within {b,d,g,p,t,k}, plus specific fricative pairs
  const stopEnds = ['b', 'd', 'g', 'p', 't', 'k']
  const confusEndPairs: string[] = []
  for (const a of stopEnds) {
    for (const b of stopEnds) {
      if (a !== b) confusEndPairs.push(`${a}-${b}`)
    }
  }
  const confusEnd = new Set([
    ...confusEndPairs,
    's-z', 'z-s', 's-c', 'c-s', 'x-j', 'j-x',
    'C-v', 'v-C', 'C-z', 'z-C', 'C-j', 'j-C',
    'f-v', 'v-f', 'v-b', 'b-v', 'b-m', 'm-b',
    'n-d', 'd-n',
  ])

  const vowelIdx: Record<string, number> = { i: 0, e: 1, a: 2, o: 3, u: 4 }
  const vowelList = ['i', 'e', 'a', 'o', 'u']

  function vowelKey(w: string): string { return w[1] + w[3] + w[5] }

  // If two words differ in exactly 1 consonant and that pair is confusable
  // (position-dependent), they must differ in at least 1 vowel.
  function tooClose(a: string, b: string): boolean {
    let consDiffCount = 0
    let confusableDiff = false
    for (const pos of [0, 2, 4, 6]) {
      if (a[pos] !== b[pos]) {
        consDiffCount++
        const pair = `${a[pos]}-${b[pos]}`
        if (pos === 6 ? confusEnd.has(pair) : confusStartMid.has(pair)) {
          confusableDiff = true
        }
      }
    }
    if (consDiffCount === 1 && confusableDiff) {
      let anyVowelDiff = false
      for (const pos of [1, 3, 5]) {
        if (a[pos] !== b[pos]) { anyVowelDiff = true; break }
      }
      if (!anyVowelDiff) return true
    }

    return false
  }

  // O(1) blocked set: for each accepted word, pre-compute all blocked variants
  const blocked = new Set<string>()
  const allConsonants = [...new Set([...cfg.starts, ...cfg.ends, ...midPool])]

  function addBlocked(word: string) {
    blocked.add(word)
    const chars = word.split('')
    // For each consonant position, generate all confusable single-swaps with same vowels
    for (const pos of [0, 2, 4, 6]) {
      const confSet = pos === 6 ? confusEnd : confusStartMid
      for (const alt of allConsonants) {
        if (alt === chars[pos]) continue
        if (confSet.has(`${chars[pos]}-${alt}`)) {
          const copy = [...chars]
          copy[pos] = alt
          blocked.add(copy.join(''))
        }
      }
    }
  }

  // Two-level round-robin: bucket by (start, v1, mid1, v2) for maximum fairness
  // This ensures every v2 slot gets a chance before any slot gets a second word.
  const buckets: Map<string, string[]> = new Map()
  for (const word of words) {
    // key = c1 + v1 + cm1 + v2 (first 4 chars for 7-letter words)
    const key = word.substring(0, 4)
    let arr = buckets.get(key)
    if (!arr) { arr = []; buckets.set(key, arr) }
    arr.push(word)
  }

  const bucketKeys = [...buckets.keys()]
  const bucketIdx: Map<string, number> = new Map()
  for (const k of bucketKeys) bucketIdx.set(k, 0)

  const accepted: string[] = []
  let progress = true

  while (progress) {
    progress = false
    for (const key of bucketKeys) {
      const arr = buckets.get(key)!
      let idx = bucketIdx.get(key)!
      while (idx < arr.length && blocked.has(arr[idx])) idx++
      if (idx >= arr.length) { bucketIdx.set(key, idx); continue }
      const word = arr[idx]
      accepted.push(word)
      addBlocked(word)
      bucketIdx.set(key, idx + 1)
      progress = true
    }
  }

  return accepted.sort(compareWords)
}

function blockCVCVC(words: string[], cfg: ComboConfig): string[] {
  // Start/mid confusable pairs
  const confusStartMid = new Set([
    's-z', 'z-s', 'c-C', 'C-c', 'f-v', 'v-f', 'x-j', 'j-x',
    'd-t', 't-d', 'g-k', 'k-g', 'b-p', 'p-b', 'v-b', 'b-v',
  ])

  // End confusable pairs
  const stopEnds = ['b', 'd', 'g', 'p', 't', 'k']
  const confusEndPairs: string[] = []
  for (const a of stopEnds) {
    for (const b of stopEnds) {
      if (a !== b) confusEndPairs.push(`${a}-${b}`)
    }
  }
  const confusEnd = new Set([
    ...confusEndPairs,
    's-z', 'z-s', 's-c', 'c-s', 'x-j', 'j-x',
    'C-v', 'v-C', 'C-z', 'z-C', 'C-j', 'j-C',
    'f-v', 'v-f', 'v-b', 'b-v', 'b-m', 'm-b',
    'n-d', 'd-n',
  ])

  const vowelIdx: Record<string, number> = { i: 0, e: 1, a: 2, o: 3, u: 4 }
  const vowelList = ['i', 'e', 'a', 'o', 'u']

  function vowelKey(w: string): string { return w[1] + w[3] }

  // If two words differ in exactly 1 consonant and that pair is confusable
  // (position-dependent), they must differ in at least 1 vowel.
  function tooClose(a: string, b: string): boolean {
    let consDiffCount = 0
    let confusableDiff = false
    for (const pos of [0, 2, 4]) {
      if (a[pos] !== b[pos]) {
        consDiffCount++
        const pair = `${a[pos]}-${b[pos]}`
        if (pos === 4 ? confusEnd.has(pair) : confusStartMid.has(pair)) {
          confusableDiff = true
        }
      }
    }
    if (consDiffCount === 1 && confusableDiff) {
      let anyVowelDiff = false
      for (const pos of [1, 3]) {
        if (a[pos] !== b[pos]) { anyVowelDiff = true; break }
      }
      if (!anyVowelDiff) return true
    }

    return false
  }

  // Index by vowel key, check nearby keys (within 1 notch each = up to 9)
  const byVowel: Map<string, string[]> = new Map()

  function nearbyVowelKeys(vk: string): string[] {
    const results: string[] = []
    const vi = [vowelIdx[vk[0]], vowelIdx[vk[1]]]
    for (let d0 = -1; d0 <= 1; d0++) {
      const i0 = vi[0] + d0
      if (i0 < 0 || i0 > 4) continue
      for (let d1 = -1; d1 <= 1; d1++) {
        const i1 = vi[1] + d1
        if (i1 < 0 || i1 > 4) continue
        results.push(vowelList[i0] + vowelList[i1])
      }
    }
    return results
  }

  function isAllowed(word: string): boolean {
    const vk = vowelKey(word)
    for (const nk of nearbyVowelKeys(vk)) {
      const bucket = byVowel.get(nk)
      if (!bucket) continue
      for (const acc of bucket) {
        if (tooClose(word, acc)) return false
      }
    }
    return true
  }

  // Round-robin across (start, v1, mid) buckets for fair distribution
  const buckets: Map<string, string[]> = new Map()
  for (const word of words) {
    const key = word[0] + word[1] + word[2]
    let arr = buckets.get(key)
    if (!arr) { arr = []; buckets.set(key, arr) }
    arr.push(word)
  }

  const bucketKeys = [...buckets.keys()]
  const bucketIdx: Map<string, number> = new Map()
  for (const k of bucketKeys) bucketIdx.set(k, 0)

  const accepted: string[] = []
  let progress = true

  while (progress) {
    progress = false
    for (const key of bucketKeys) {
      const arr = buckets.get(key)!
      let idx = bucketIdx.get(key)!
      while (idx < arr.length && !isAllowed(arr[idx])) idx++
      if (idx >= arr.length) { bucketIdx.set(key, idx); continue }
      const word = arr[idx]
      accepted.push(word)

      const vk = vowelKey(word)
      let va = byVowel.get(vk)
      if (!va) { va = []; byVowel.set(vk, va) }
      va.push(word)

      bucketIdx.set(key, idx + 1)
      progress = true
    }
  }

  return accepted.sort(compareWords)
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Run ───────────────────────────────────────────────

function runCombo(cfg: ComboConfig) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Combo ${cfg.name}: Start [${cfg.starts.join(' ')}] / End [${cfg.ends.join(' ')}]`)
  console.log(`${'='.repeat(60)}`)

  // Print end assignment with usage stats
  for (let si = 0; si < cfg.starts.length; si++) {
    const parts: string[] = []
    for (let vi = 0; vi < vowels.length; vi++) {
      const ends = cfg.endMap.get(`${si}-${vi}`) ?? []
      parts.push(`${vowels[vi]}:[${ends.join(',')}]`)
    }
    console.log(`  ${cfg.starts[si]}: ${parts.join('  ')}`)
  }
  const usage: Record<string, number> = {}
  for (const ends of cfg.endMap.values()) {
    for (const c of ends) usage[c] = (usage[c] ?? 0) + 1
  }
  console.log(`  Usage: ${Object.entries(usage).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(' ')}`)

  // CVC
  const cvc = generateCVC(cfg)
  console.log(`\nCVC: ${cvc.length}`)

  const endDist: Record<string, number> = {}
  for (const w of cvc) {
    const last = w[w.length - 1]
    endDist[last] = (endDist[last] ?? 0) + 1
  }
  console.log(`CVC end dist: ${Object.entries(endDist).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(' ')}`)

  // CVCVC now uses unified generator (run separately)
  const cvcvc: string[] = []

  console.log(`\nSample CVC (first 30):`)
  for (const w of cvc.slice(0, 30)) console.log(`  ${w}`)

  const dir = resolve(__dirname, `../base/combo-${cfg.name}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, '3.csv'), 'word\n' + cvc.join('\n') + '\n')
  writeFileSync(resolve(dir, '5.csv'), 'word\n' + cvcvc.join('\n') + '\n')

  // 2-word joins file
  const twoWordJoins = generate2WordJoins(cvc)
  shuffle(twoWordJoins)
  writeFileSync(resolve(dir, '6.csv'), 'word\n' + twoWordJoins.join('\n') + '\n')

  // CVCVCVC now uses unified generator (run separately)
  const cvcvcvc: string[] = []

  console.log(`Wrote to base/combo-${cfg.name}/`)

  return {
    cvcWords: cvc, cvcvcWords: cvcvc, cvcvcvcWords: cvcvcvc,
    cvc: cvc.length, cvcvc: cvcvc.length, cvcvcRaw: 0, cvcvcvc: cvcvcvc.length, cvcvcvcRaw: 0,
  }
}

// ─── Main ──────────────────────────────────────────────

const unifiedDir = resolve(__dirname, '../base/unified')
mkdirSync(unifiedDir, { recursive: true })

// Unified CVC
console.log(`\n${'='.repeat(60)}`)
console.log('UNIFIED CVC (all consonants)')
console.log(`${'='.repeat(60)}`)
const unifiedCvc = generateCVC_unified()
console.log(`CVC unified: ${unifiedCvc.length.toLocaleString()}`)
writeFileSync(resolve(unifiedDir, '3.csv'), 'word\n' + unifiedCvc.join('\n') + '\n')
console.log(`Wrote to base/unified/3.csv`)

// Unified CVCVC (all consonants, one generator)
console.log(`\n${'='.repeat(60)}`)
console.log('UNIFIED CVCVC (all consonants)')
console.log(`${'='.repeat(60)}`)
const unifiedCvcvc = generateCVCVC_unified()
console.log(`CVCVC unified: ${unifiedCvcvc.length.toLocaleString()}`)
writeFileSync(resolve(unifiedDir, '5.csv'), 'word\n' + unifiedCvcvc.join('\n') + '\n')
console.log(`Wrote to base/unified/5.csv`)

// Unified CVCVCVC
console.log(`\n${'='.repeat(60)}`)
console.log('UNIFIED CVCVCVC (all consonants)')
console.log(`${'='.repeat(60)}`)
const unifiedCvcvcvc = generateCVCVCVC_unified()
console.log(`CVCVCVC unified: ${unifiedCvcvcvc.length.toLocaleString()}`)
writeFileSync(resolve(unifiedDir, '7.csv'), 'word\n' + unifiedCvcvcvc.join('\n') + '\n')
console.log(`Wrote to base/unified/7.csv`)

// Per-combo runs (CVC still uses combo system)
const results: Record<string, ReturnType<typeof runCombo>> = {}
results['1'] = runCombo(combo1)
results['2'] = runCombo(combo2)
results['3'] = runCombo(combo3)
results['4'] = runCombo(combo4)

console.log(`\n${'='.repeat(60)}`)
console.log('SUMMARY')
console.log(`${'='.repeat(60)}`)
console.log(`\n| Combo | CVC | CVCVC raw | CVCVC | CVCVCVC raw | CVCVCVC |`)
console.log(`| :--- | ---: | ---: | ---: | ---: | ---: |`)
for (const [name, r] of Object.entries(results)) {
  console.log(`| ${name} | ${r.cvc} | ${r.cvcvcRaw.toLocaleString()} | ${r.cvcvc.toLocaleString()} | ${r.cvcvcvcRaw.toLocaleString()} | ${r.cvcvcvc.toLocaleString()} |`)
}

// Unified joins across all combos
console.log(`\n${'='.repeat(60)}`)
console.log('UNIFIED JOINS (all combos pooled)')
console.log(`${'='.repeat(60)}`)

const allCvc = unifiedCvc
const allCvcvc = unifiedCvcvc
const allCvcvcvc = unifiedCvcvcvc
console.log(`\nTotal CVC: ${allCvc.length}`)
console.log(`Total CVCVC: ${allCvcvc.length}`)
console.log(`Total CVCVCVC: ${allCvcvcvc.length}`)

const joinsCvcCvc = countJoinsUnordered(allCvc)
console.log(`CVC+CVC: ${joinsCvcCvc.toLocaleString()}`)

const joinsCvcCvcvc = countCrossJoinsUnordered(allCvc, allCvcvc)
console.log(`CVC↔CVCVC: ${joinsCvcCvcvc.toLocaleString()}`)

const joinsCvcCvcvcvc = countCrossJoinsUnordered(allCvc, allCvcvcvc)
console.log(`CVC↔CVCVCVC: ${joinsCvcCvcvcvc.toLocaleString()}`)

console.log(`Computing CVC+CVC+CVC (${allCvc.length} words, ${(allCvc.length * (allCvc.length - 1) * (allCvc.length - 2) / 6).toLocaleString()} triples)...`)
const joinsCvcCvcCvc = count3WordJoinsUnordered(allCvc)
console.log(`CVC+CVC+CVC: ${joinsCvcCvcCvc.toLocaleString()}`)

const totalJoins = joinsCvcCvc + joinsCvcCvcvc + joinsCvcCvcvcvc + joinsCvcCvcCvc
console.log(`Total: ${totalJoins.toLocaleString()}`)
