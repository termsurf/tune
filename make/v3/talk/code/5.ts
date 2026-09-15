import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const consonants = 'mnqgdbptkhsfvzjxcCwlry'.split('')
const vowels = 'ieaou'.split('')

function isVowel(ch: string): boolean {
  return vowels.includes(ch)
}

const adjacentVowels = new Set(['ie', 'ei', 'ea', 'ae', 'ao', 'oa', 'ou', 'uo'])

function vowelsClose(a: string, b: string): boolean {
  return a === b || adjacentVowels.has(a + b)
}

const vowelOrder = 'ieaou'

// Broad groups for 5-letter intensive filtering
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

// CVCVC: positions 0=c1, 1=v1, 2=c2, 3=v2, 4=c3
// Vowel positions and their neighboring consonant positions
const vPositions = [1, 3]
const vowelNeighborCs: Record<number, number[]> = {
  1: [0, 2],
  3: [2, 4],
}

// Generate all words that would be "too close" to the given word
function generateBlocked(word: string): string[] {
  const chars = word.split('')
  const blocked: string[] = []

  // Rule 1: differ by exactly 1 position
  for (let i = 0; i < 5; i++) {
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

          let isBlocked = false
          if (vowelDist <= 1) {
            isBlocked = true
          } else if (broadMap.get(altC) === origCGroup) {
            isBlocked = true
          }

          if (isBlocked) {
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
const badTails = new Set(['er', 'el', 'ir', 'il'])
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
  if (word[2] === 'h' || word[2] === 'y' || word[2] === 'q') return false // no h/y/q in center consonant
  // j only at start
  for (let i = 1; i < word.length; i++) {
    if (word[i] === 'j') return false
  }
  // no bad fricative pairs across vowels: (0,2), (2,4)
  for (const [a, b] of [[0, 2], [2, 4]] as const) {
    if (badConsonantPair(word[a], word[b])) return false
  }
  // max 1 of x/j/c/C total per word
  const rareCount = word.split('').filter(ch => ch === 'x' || ch === 'j' || ch === 'c' || ch === 'C').length
  if (rareCount > 1) return false
  const tail = word.slice(-2)
  if (badTails.has(tail)) return false
  return true
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const textDir = path.resolve(__dirname, '..', '..', '..', 'text')

const initialPath = path.join(textDir, '5.initial.csv')
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

const tsvTerms = extractTermsFromTsv(path.join(textDir, 'tune.5.tsv'))
const doneTerms = extractTermsFromTsv(path.join(textDir, 'tune.5.done.tsv'))

const existing = new Set([...initialRaw, ...tsvTerms, ...doneTerms])

// Generate all CVCVC words
const allWords: string[] = []
for (const c1 of consonants) {
  for (const v1 of vowels) {
    for (const c2 of consonants) {
      for (const v2 of vowels) {
        for (const c3 of consonants) {
          const word = c1 + v1 + c2 + v2 + c3
          if (validWord(word)) allWords.push(word)
        }
      }
    }
  }
}

// Shuffle
for (let i = allWords.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1))
  ;[allWords[i], allWords[j]] = [allWords[j], allWords[i]]
}

// Build rejection set from existing words
const blockedSet = new Set<string>()
for (const word of existing) {
  if (word.length === 5) {
    blockedSet.add(word)
    for (const b of generateBlocked(word)) blockedSet.add(b)
  }
}

console.log(`Rejection set size from existing: ${blockedSet.size}`)

// Filter candidates
const added: string[] = []
const finalSet = new Set(existing)

for (const candidate of allWords) {
  if (blockedSet.has(candidate)) continue

  added.push(candidate)
  finalSet.add(candidate)
  blockedSet.add(candidate)
  for (const b of generateBlocked(candidate)) blockedSet.add(b)
}

// Sort with j/c/C words gradually increasing toward end
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
const outPath = path.join(textDir, '5.more.csv')
fs.writeFileSync(outPath, outLines.join('\n') + '\n')

console.log(`Initial: ${initialRaw.length} (${filteredInitial.length} after excluding tsv/done)`)
console.log(`Added: ${added.length}`)
console.log(`Total: ${filteredInitial.length + added.length}`)
console.log(`Wrote to ${outPath}`)
