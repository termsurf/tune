import fs from 'fs'
import path from 'path'

const consonants = 'mnqgdbptkhsfvzjxcCwlry'.split('')
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

function getPattern(word: string): string {
  return word.split('').map(ch => isVowel(ch) ? 'V' : 'C').join('')
}

const adjacentVowels = new Set(['ie', 'ei', 'ea', 'ae', 'ao', 'oa', 'ou', 'uo'])

function vowelsClose(a: string, b: string): boolean {
  return a === b || adjacentVowels.has(a + b)
}

function tooClose(a: string, b: string): boolean {
  if (a.length !== 4 || b.length !== 4) return false

  const patA = getPattern(a)
  const patB = getPattern(b)
  if (patA !== patB) return false

  if (patA === 'CVCC') {
    // c1 v c2 c3
    if (!vowelsClose(a[1], b[1])) return false
    const c1Sim = areSimilar(a[0], b[0])
    const c2Sim = areSimilar(a[2], b[2])
    const c3Sim = areSimilar(a[3], b[3])
    if (c1Sim && c2Sim && c3Sim) return true
  } else if (patA === 'CCVC') {
    // c1 c2 v c3
    if (!vowelsClose(a[2], b[2])) return false
    const c1Sim = areSimilar(a[0], b[0])
    const c2Sim = areSimilar(a[1], b[1])
    const c3Sim = areSimilar(a[3], b[3])
    if (c1Sim && c2Sim && c3Sim) return true
  }

  return false
}

const noEnd = new Set(['h', 'w', 'y'])
const badTails = new Set(['er', 'el', 'ir', 'il'])

const ONSET_CLUSTERS = new Set(
  `br bl dr fr fl gr gl kr kl pr pl tr vr sk sp st sl sm sn tx`.split(/\s+/),
)

const CODA_CLUSTERS = new Set(
  `mp nt nd qk lp lb lf lv ls lx lz lt lc ld lk rp rb rf rv rs rz rt rd rk rg rx ft ps px ks kx bz gz ts dj dz sk sp st xt`.split(/\s+/),
)

function validWord(word: string): boolean {
  if (noEnd.has(word[word.length - 1])) return false
  if (word.includes('w')) return false
  for (let i = 0; i < word.length - 1; i++) {
    if (badTails.has(word[i] + word[i + 1])) return false
  }

  const pattern = getPattern(word)
  if (pattern === 'CCVC') {
    const onset = word.slice(0, 2)
    if (!ONSET_CLUSTERS.has(onset)) return false
    const xj = new Set(['x', 'j'])
    if (xj.has(onset[0]) || xj.has(onset[1])) return false
  } else if (pattern === 'CVCC') {
    const coda = word.slice(2)
    if (!CODA_CLUSTERS.has(coda)) return false
    const xj = new Set(['x', 'j'])
    if (xj.has(coda[0]) || xj.has(coda[1])) return false
  }
  return true
}

const textDir = path.resolve(__dirname, '..', '..', '..', 'text')
const initialRaw = fs
  .readFileSync(path.join(textDir, '4.initial.csv'), 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean)

function extractTermsFromTsv(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(l => (l.split('\t')[1] || '').trim())
    .filter(Boolean)
}

const tsvTerms = extractTermsFromTsv(path.join(textDir, 'tune.4.tsv'))
const doneTerms = extractTermsFromTsv(path.join(textDir, 'tune.4.done.tsv'))

const existing = new Set([...initialRaw, ...tsvTerms, ...doneTerms])

// Generate all CVCC words using valid coda clusters
const allWords: string[] = []
for (const c1 of consonants) {
  for (const v of vowels) {
    for (const coda of CODA_CLUSTERS) {
      const word = c1 + v + coda
      if (validWord(word)) allWords.push(word)
    }
  }
}

// Generate all CCVC words using valid onset clusters
for (const onset of ONSET_CLUSTERS) {
  if (onset.length !== 2) continue
  for (const v of vowels) {
    for (const c3 of consonants) {
      const word = onset + v + c3
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
const outPath = path.join(textDir, '4.more.csv')
fs.writeFileSync(outPath, outLines.join('\n') + '\n')

console.log(`Initial: ${initialRaw.length} (${filteredInitial.length} after excluding tsv/done)`)
console.log(`Added: ${added.length}`)
console.log(`Total: ${filteredInitial.length + added.length}`)
console.log(`Wrote to ${outPath}`)
