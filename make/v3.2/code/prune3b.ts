import fs from 'fs'
import path from 'path'

const textDir = path.resolve(__dirname, '..', '..', '..', 'text')

const termsRaw = fs
  .readFileSync(path.join(textDir, '3-terms-base-original.csv'), 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean)

const termsHeader = termsRaw[0]
const terms = termsRaw.slice(1)

const tsvLines = fs
  .readFileSync(path.join(textDir, 'tune.3.tsv'), 'utf-8')
  .split('\n')
  .filter(l => l.trim())

const donePath = path.join(textDir, 'tune.3.done.tsv')
const doneExisting = fs.existsSync(donePath)
  ? fs.readFileSync(donePath, 'utf-8').split('\n').filter(l => l.trim())
  : []

function getMeaning(tsvLine: string): string {
  const parts = tsvLine.split('\t')
  return (parts[2] || '').trim().toLowerCase()
}

function matchesTerm(meaning: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'i')
  return re.test(meaning)
}

const matched = new Set<string>()
const matchedTsvLines = new Set<string>()
const doneLines: string[] = []

for (const term of terms) {
  for (const line of tsvLines) {
    if (matchedTsvLines.has(line)) continue
    const meaning = getMeaning(line)
    if (!meaning) continue
    if (matchesTerm(meaning, term)) {
      matched.add(term)
      matchedTsvLines.add(line)
      doneLines.push(line)
    }
  }
}

const remainingTerms = terms.filter(t => !matched.has(t))
const remainingTsv = tsvLines.filter(l => !matchedTsvLines.has(l))

fs.writeFileSync(
  path.join(textDir, '3-terms-base-original.csv'),
  [termsHeader, ...remainingTerms].join('\n') + '\n',
)

fs.writeFileSync(
  path.join(textDir, 'tune.3.tsv'),
  remainingTsv.join('\n') + '\n',
)

fs.writeFileSync(
  donePath,
  [...doneExisting, ...doneLines].join('\n') + '\n',
)

console.log(`Matched: ${matched.size}`)
console.log(`Remaining in 3-terms-base-original.csv: ${remainingTerms.length}`)
console.log(`Remaining in tune.3.tsv: ${remainingTsv.length}`)
console.log(`Appended to tune.3.done.tsv: ${doneLines.length}`)
