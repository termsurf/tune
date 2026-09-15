import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const consonants = 'mnqgdbptkhsfvzjxcClry'.split('')
const vowels = 'ieaou'.split('')

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

function isVowel(ch: string): boolean {
  return vowels.includes(ch)
}

const adjacentVowels = new Set(['ie', 'ei', 'ea', 'ae', 'ao', 'oa', 'ou', 'uo'])

function vowelsClose(a: string, b: string): boolean {
  return a === b || adjacentVowels.has(a + b)
}

const vowelOrder = 'ieaou'

// Broad groups for intensive filtering
const broadGroups: string[][] = [
  ['b', 'm', 'p', 'n', 'q', 'd', 'g', 't', 'k'], // stops + nasals
  ['s', 'f', 'v', 'z', 'x', 'j', 'c', 'C'], // fricatives
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

// CCVCC: positions 0=c1, 1=c2, 2=v, 3=c3, 4=c4
function tooClose(a: string, b: string): boolean {
  if (a.length !== 5 || b.length !== 5) return false

  // Both must be CCVCC
  for (let i = 0; i < 5; i++) {
    if (isVowel(a[i]) !== isVowel(b[i])) return false
  }

  // Count differences
  const diffs: number[] = []
  for (let i = 0; i < 5; i++) {
    if (a[i] !== b[i]) diffs.push(i)
  }

  // Rule 1: differ by exactly 1 position → too close
  if (diffs.length <= 1) return true

  // Rule 2: differ by exactly 2 positions (1 vowel + 1 neighboring consonant)
  if (diffs.length === 2) {
    const [d1, d2] = diffs
    const d1IsV = isVowel(a[d1])
    const d2IsV = isVowel(a[d2])

    // One vowel, one consonant
    if (d1IsV !== d2IsV) {
      const vi = d1IsV ? d1 : d2
      const ci = d1IsV ? d2 : d1

      const isNeighbor = Math.abs(vi - ci) === 1
      if (isNeighbor) {
        const vowelDist = Math.abs(vowelOrder.indexOf(a[vi]) - vowelOrder.indexOf(b[vi]))
        // Vowel off by 1 → always too close
        if (vowelDist <= 1) return true
        // Vowel off by 2+ but consonant in same broad group → too close
        if (sameBroadGroup(a[ci], b[ci])) return true
      }
    }
  }

  return false
}

const ONSET_CLUSTERS = new Set(
  `br bl dr fr fl gr gl kr kl pr pl tr vr sk sp st sl sm sn tx`.split(/\s+/),
)

const CODA_CLUSTERS = new Set(
  `mp nt nd qk lp lb lf lv ls lx lz lt lc ld lk rp rb rf rv rs rz rt rd rk rg rx ft ps px ks kx bz gz ts dj dz sk sp st xt`.split(/\s+/),
)

const badPairs = new Set(['er', 'el', 'ir', 'il'])
const excluded = new Set(['h', 'w', 'y', 'q'])

function validWord(word: string): boolean {
  // No h/w/y/q anywhere
  for (const ch of word) {
    if (excluded.has(ch)) return false
  }
  // No el/er/il/ir anywhere
  for (let i = 0; i < word.length - 1; i++) {
    if (badPairs.has(word[i] + word[i + 1])) return false
  }
  // Valid onset cluster (positions 0-1)
  const onset = word.slice(0, 2)
  if (!ONSET_CLUSTERS.has(onset)) return false
  // Valid coda cluster (positions 3-4)
  const coda = word.slice(3)
  if (!CODA_CLUSTERS.has(coda)) return false
  // Max 1 x/j per word
  const xjCount = word.split('').filter(ch => ch === 'x' || ch === 'j').length
  if (xjCount > 1) return false
  // Max 1 c/C per word
  const cCCount = word.split('').filter(ch => ch === 'c' || ch === 'C').length
  if (cCCount > 1) return false
  return true
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const textDir = path.resolve(__dirname, '..', '..', '..', 'text')

const initialPath = path.join(textDir, '5.ccvcc.initial.csv')
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

// Generate all CCVCC words
const allWords: string[] = []
for (const onset of ONSET_CLUSTERS) {
  if (onset.length !== 2) continue
  for (const v of vowels) {
    for (const coda of CODA_CLUSTERS) {
      if (coda.length !== 2) continue
      const word = onset + v + coda
      if (validWord(word)) allWords.push(word)
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

shuffle(allWords)

// Filter candidates
const added: string[] = []
const finalSet = new Set(existing)

for (const candidate of allWords) {
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

const excludeSet = new Set([...tsvTerms, ...doneTerms])
const filteredInitial = initialRaw.filter(t => !excludeSet.has(t))
const outLines = [...filteredInitial, '', ...added]
const outPath = path.join(textDir, '5.ccvcc.more.csv')
fs.writeFileSync(outPath, outLines.join('\n') + '\n')

console.log(`Valid candidates: ${allWords.length}`)
console.log(`Initial: ${initialRaw.length} (${filteredInitial.length} after excluding tsv/done)`)
console.log(`Added: ${added.length}`)
console.log(`Total: ${filteredInitial.length + added.length}`)
console.log(`Wrote to ${outPath}`)
