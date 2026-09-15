import fs from 'fs'
import path from 'path'

const consonants = 'mnqgdbptkhsfvzjxcCwlry'.split('')
const vowels = 'ieaou'.split('')

// Similarity groups: consonants that are too close to each other
// Same place of articulation, or voiced/unvoiced pairs, or nasals
const similarGroups: string[][] = [
  ['m', 'n', 'q'], // nasals
  ['b', 'p'], // bilabial stops
  ['d', 't'], // alveolar stops
  ['b', 'd'], // voiced stops
  ['p', 't'], // voiceless stops
  ['g', 'k'],      // velar stops
  ['s', 'z'], // alveolar fricatives
  ['x', 'j'], // postalveolar fricatives
  ['c', 'C'], // dental fricatives
  ['f', 'v'], // labiodental fricatives
  ['s', 'c'], // voiceless alveolar/dental
  ['z', 'C'], // voiced alveolar/dental
  ['j', 'C'], // voiced postalveolar/dental
  ['x', 'c'], // voiceless postalveolar/dental
  ['f', 'c'], // voiceless labio/dental
  ['C', 'v'], // voiced dental/labio
  ['l', 'r'], // liquids
]

const similarMap = new Map<string, Set<string>>()
for (const ch of consonants) {
  similarMap.set(ch, new Set([ch]))
}
for (const group of similarGroups) {
  for (const a of group) {
    for (const b of group) {
      similarMap.get(a)!.add(b)
    }
  }
}

function areSimilar(a: string, b: string): boolean {
  return similarMap.get(a)?.has(b) ?? false
}

const adjacentVowels = new Set(['ie', 'ei', 'ea', 'ae', 'ao', 'oa', 'ou', 'uo'])

function vowelsClose(a: string, b: string): boolean {
  return a === b || adjacentVowels.has(a + b)
}

function tooClose(a: string, b: string): boolean {
  if (a.length !== 3 || b.length !== 3) return false

  const c1a = a[0], v1a = a[1], c2a = a[2]
  const c1b = b[0], v1b = b[1], c2b = b[2]

  // Vowels must be the same or adjacent for words to be "too close"
  if (!vowelsClose(v1a, v1b)) return false

  const c1Same = c1a === c1b
  const c2Same = c2a === c2b
  const c1Sim = areSimilar(c1a, c1b)
  const c2Sim = areSimilar(c2a, c2b)

  // Identical
  if (c1Same && c2Same) return true

  // One consonant differs but is in the same similarity group
  if (c1Same && c2Sim) return true
  if (c1Sim && c2Same) return true

  // Both consonants are similar (same groups) - still too close
  if (c1Sim && c2Sim) return true

  return false
}

const textDir = path.resolve(__dirname, '..', '..', '..', 'text')
const initialRaw = fs
  .readFileSync(path.join(textDir, '3.initial.csv'), 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean)

const existing = new Set(initialRaw)

const noStart = new Set(['q', 'w', 'y'])
const noEnd = new Set(['h', 'w', 'y'])

// Generate all possible CVC words
const allCVC: string[] = []
for (const c1 of consonants) {
  if (noStart.has(c1)) continue
  for (const v of vowels) {
    for (const c2 of consonants) {
      if (noEnd.has(c2)) continue
      const word = c1 + v + c2
      const tail = v + c2
      if (tail === 'er' || tail === 'el' || tail === 'ir' || tail === 'il') continue
      allCVC.push(word)
    }
  }
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

shuffle(allCVC)

// Filter candidates: not already existing, not too close to any existing word
const added: string[] = []
const finalSet = new Set(existing)

for (const candidate of allCVC) {
  if (finalSet.has(candidate)) continue

  let close = false
  for (const word of finalSet) {
    if (tooClose(candidate, word)) {
      close = true
      break
    }
  }

  if (!close) {
    added.push(candidate)
    finalSet.add(candidate)
  }
}

const outLines = [...initialRaw, '', ...added]
const outPath = path.join(textDir, '3.more.csv')
fs.writeFileSync(outPath, outLines.join('\n') + '\n')

console.log(`Initial: ${initialRaw.length}`)
console.log(`Added: ${added.length}`)
console.log(`Total: ${finalSet.size}`)
console.log(`Wrote to ${outPath}`)
