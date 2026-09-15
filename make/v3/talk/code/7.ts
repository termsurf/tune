import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const consonants = 'mnqgdbptkhsfvzjxcCwlry'.split('')
const vowels = 'ieaou'.split('')

function isVowel(ch: string): boolean {
  return vowels.includes(ch)
}

const adjacentVowels = new Set(['ie', 'ei', 'ea', 'ae', 'ao', 'oa', 'ou', 'uo'])

const vowelOrder = 'ieaou'

// Broad groups for intensive filtering
const broadGroups: string[][] = [
  ['b', 'm', 'p', 'n', 'q', 'd', 'g', 't', 'k'], // stops + nasals
  ['h', 's', 'f', 'v', 'z', 'x', 'j', 'c', 'C'], // fricatives + h
  ['l', 'r'], // liquids
]

const broadMap = new Map<string, number>()
for (let i = 0; i < broadGroups.length; i++) {
  for (const ch of broadGroups[i]) {
    broadMap.set(ch, i)
  }
}

function sameBroadGroup(a: string, b: string): boolean {
  return broadMap.get(a) === broadMap.get(b)
}

// Consonant positions and vowel positions in CVCVCVC
const cPositions = [0, 2, 4, 6]
const vPositions = [1, 3, 5]

// For each vowel position, its neighboring consonant positions
const vowelNeighborCs: Record<number, number[]> = {
  1: [0, 2],
  3: [2, 4],
  5: [4, 6],
}

// Generate all words that would be "too close" to the given word
function generateBlocked(word: string): string[] {
  const chars = word.split('')
  const blocked: string[] = []

  // Rule 1: differ by exactly 1 position
  for (let i = 0; i < 7; i++) {
    const alts = isVowel(chars[i]) ? vowels : consonants
    for (const alt of alts) {
      if (alt === chars[i]) continue
      const copy = [...chars]
      copy[i] = alt
      blocked.push(copy.join(''))
    }
  }

  // Rule 2: differ by exactly 2 positions (1 vowel + 1 neighboring consonant)
  for (const vi of vPositions) {
    const origV = chars[vi]
    const origVIdx = vowelOrder.indexOf(origV)

    for (const ci of vowelNeighborCs[vi]) {
      const origC = chars[ci]
      const origCGroup = broadMap.get(origC)!

      for (const altV of vowels) {
        if (altV === origV) continue
        const altVIdx = vowelOrder.indexOf(altV)
        const vowelDist = Math.abs(origVIdx - altVIdx)

        for (const altC of consonants) {
          if (altC === origC) continue

          let blocked2 = false
          if (vowelDist <= 1) {
            // Vowel off by 1 → always too close regardless of consonant
            blocked2 = true
          } else if (broadMap.get(altC) === origCGroup) {
            // Vowel off by 2+ but consonant in same broad group → too close
            blocked2 = true
          }

          if (blocked2) {
            const copy = [...chars]
            copy[vi] = altV
            copy[ci] = altC
            blocked.push(copy.join(''))
          }
        }
      }
    }
  }

  return blocked
}

const noStart = new Set(['q', 'w', 'y'])
const noEnd = new Set(['h', 'w', 'y'])
const badPairs = new Set(['er', 'el', 'ir', 'il'])
const noRepeatC = new Set(['r', 'l', 'f', 'v', 'z', 'x', 'j', 'C', 'c', 's'])

// Voicing pairs blocked across vowels
const voicingPartner: Record<string, string> = {
  s: 'z', z: 's', f: 'v', v: 'f', c: 'C', C: 'c', j: 'x', x: 'j',
  d: 't', t: 'd', b: 'p', p: 'b', g: 'k', k: 'g',
}

function badConsonantPair(a: string, b: string): boolean {
  // Mixed voicing pair (d-t, b-p, g-k, s-z, f-v, c-C, j-x): blocked
  if (voicingPartner[a] === b) return true
  // For fricatives: same pair and cross-pair voicing mismatch also blocked
  const allFricatives = new Set(['s', 'z', 'f', 'v', 'c', 'C', 'j', 'x'])
  if (!allFricatives.has(a) || !allFricatives.has(b)) return false
  const voicedFricatives = new Set(['z', 'v', 'C', 'j'])
  // Same pair: always blocked (caught above for mixed, catch same here)
  if (a === b) return true
  // Cross-pair: must match voicing
  if (voicedFricatives.has(a) !== voicedFricatives.has(b)) return true
  return false
}

function validWord(word: string): boolean {
  if (noStart.has(word[0])) return false
  if (noEnd.has(word[word.length - 1])) return false
  if (word.includes('w')) return false
  // no h/y/q in interior consonants (positions 2, 4)
  for (const i of [2, 4]) {
    if (word[i] === 'h' || word[i] === 'y' || word[i] === 'q') return false
  }
  // no el/er/il/ir anywhere
  for (let i = 0; i < word.length - 1; i++) {
    if (badPairs.has(word[i] + word[i + 1])) return false
  }
  // no sequential duplicate consonants across vowels
  for (const [a, b] of [[0, 2], [2, 4], [4, 6]] as const) {
    if (word[a] === word[b] && noRepeatC.has(word[a])) return false
  }
  // no bad fricative pairs across vowels
  for (const [a, b] of [[0, 2], [2, 4], [4, 6]] as const) {
    if (badConsonantPair(word[a], word[b])) return false
  }
  // no e-e, i-i, u-u across consonants in VCV sequences
  const noRepeatV = new Set(['e', 'i', 'u'])
  for (const [a, b] of [[1, 3], [3, 5]] as const) {
    if (word[a] === word[b] && noRepeatV.has(word[a])) return false
  }
  // j only at start
  for (let i = 1; i < word.length; i++) {
    if (word[i] === 'j') return false
  }
  // max 1 of x/j/c/C total per word
  const rareCount = word.split('').filter(ch => ch === 'x' || ch === 'j' || ch === 'c' || ch === 'C').length
  if (rareCount > 1) return false
  return true
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const textDir = path.resolve(__dirname, '..', '..', '..', 'text')

const initialPath = path.join(textDir, '7.initial.csv')
const initialRaw = fs.existsSync(initialPath)
  ? fs.readFileSync(initialPath, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean)
  : []

function extractTermsFromTsv(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(l => (l.split('\t')[1] || '').trim())
    .filter(Boolean)
}

const tsvTerms = extractTermsFromTsv(path.join(textDir, 'tune.7.tsv'))
const doneTerms = extractTermsFromTsv(path.join(textDir, 'tune.7.done.tsv'))

const existing = new Set([...initialRaw, ...tsvTerms, ...doneTerms])

// Weighted sampling
const vowelWeights: Record<string, number> = {
  i: 5.9, e: 4, a: 9, o: 7, u: 6,
}
const consonantWeights: Record<string, number> = {
  m: 10, n: 10, q: 8, g: 9, d: 9, b: 9, p: 9, t: 10, k: 10,
  h: 5.6, s: 10, f: 8, v: 8, z: 8, j: 0.3, x: 9, c: 0.4, C: 0.3,
  w: 0, l: 7, r: 8, y: 9,
}

function buildWeightedPicker(items: string[], weights: Record<string, number>): () => string {
  const filtered = items.filter(ch => (weights[ch] ?? 0) > 0)
  const cumulative: { ch: string; cumWeight: number }[] = []
  let total = 0
  for (const ch of filtered) {
    total += weights[ch] ?? 0
    cumulative.push({ ch, cumWeight: total })
  }
  return () => {
    const r = Math.random() * total
    for (const entry of cumulative) {
      if (r < entry.cumWeight) return entry.ch
    }
    return cumulative[cumulative.length - 1].ch
  }
}

const pickVowel = buildWeightedPicker(vowels, vowelWeights)
const pickConsonant = buildWeightedPicker(consonants, consonantWeights)

// Inverse vowel weights for replacement priority (lower weight = more likely to be replaced)
const vowelReplacePriority: Record<string, number> = {}
const maxVowelWeight = Math.max(...vowels.map(v => vowelWeights[v]))
for (const v of vowels) {
  vowelReplacePriority[v] = maxVowelWeight - vowelWeights[v] + 0.1
}

// Slot weights: position 1 (v1) = 1, position 3 (v2) = 1.34, position 5 (v3) = 2
const slotWeights = [1, 1.34, 2]

function ensureA(chars: string[]): void {
  if (chars[1] === 'a' || chars[3] === 'a' || chars[5] === 'a') return

  // Group vowel slots by their vowel value
  const slotsByVowel = new Map<string, number[]>()
  for (const si of [0, 1, 2]) {
    const vi = si * 2 + 1 // vowel positions: 1, 3, 5
    const ch = chars[vi]
    if (!slotsByVowel.has(ch)) slotsByVowel.set(ch, [])
    slotsByVowel.get(ch)!.push(si)
  }

  // Build weighted candidates: weight = replacePriority * slotWeight
  // For duplicate vowels, slot weight depends on count: [1, 1.34, 2]
  const candidates: { pos: number; weight: number }[] = []
  for (const [ch, slots] of slotsByVowel) {
    const priority = vowelReplacePriority[ch]
    for (let idx = 0; idx < slots.length; idx++) {
      const sw = slotWeights[idx]
      candidates.push({ pos: slots[idx] * 2 + 1, weight: priority * sw })
    }
  }

  // Weighted pick
  let total = 0
  for (const c of candidates) total += c.weight
  let r = Math.random() * total
  for (const c of candidates) {
    r -= c.weight
    if (r <= 0) {
      chars[c.pos] = 'a'
      return
    }
  }
  chars[candidates[candidates.length - 1].pos] = 'a'
}

// Build rejection set from existing words
const blockedSet = new Set<string>()
for (const word of existing) {
  if (word.length === 7) {
    blockedSet.add(word)
    for (const b of generateBlocked(word)) blockedSet.add(b)
  }
}

console.log(`Rejection set size from existing: ${blockedSet.size}`)

// Generate and filter CVCVCVC words via weighted random sampling
const added: string[] = []
const finalSet = new Set(existing)
const TARGET = 2000000
let generated = 0
let rejected = 0

while (generated < TARGET) {
  const chars = [pickConsonant(), pickVowel(), pickConsonant(), pickVowel(), pickConsonant(), pickVowel(), pickConsonant()]
  ensureA(chars)
  const word = chars.join('')
  if (!validWord(word)) continue
  generated++

  if (blockedSet.has(word)) {
    rejected++
    continue
  }

  added.push(word)
  finalSet.add(word)
  blockedSet.add(word)
  for (const b of generateBlocked(word)) blockedSet.add(b)
}

// Sort with j/c/C words gradually increasing toward end
// Exponent < 1 biases random() toward 1.0 (end of list)
function sortKey(word: string): number {
  if (word.includes('C')) return Math.random() ** 0.3
  if (word.includes('c')) return Math.random() ** 0.4
  if (word.includes('j')) return Math.random() ** 0.6
  return Math.random()
}
const sortKeys = added.map(w => ({ w, k: sortKey(w) }))
sortKeys.sort((a, b) => a.k - b.k)
added.length = 0
for (const { w } of sortKeys) added.push(w)

const excludeSet = new Set([...tsvTerms, ...doneTerms])
const filteredInitial = initialRaw.filter(t => !excludeSet.has(t))
const outLines = [...filteredInitial, '', ...added]
const outPath = path.join(textDir, '7.more.csv')
fs.writeFileSync(outPath, outLines.join('\n') + '\n')

console.log(`Generated: ${generated}, Rejected: ${rejected}, Accepted: ${added.length}`)
console.log(`Rejection set final size: ${blockedSet.size}`)
console.log(`Initial: ${initialRaw.length} (${filteredInitial.length} after excluding tsv/done)`)
console.log(`Total: ${filteredInitial.length + added.length}`)
console.log(`Wrote to ${outPath}`)
