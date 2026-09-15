import fs from 'fs'
import path from 'path'

const textDir = path.resolve(__dirname, '..', '..', '..', 'text')

const termsRaw = fs
  .readFileSync(path.join(textDir, '3-terms.csv'), 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean)

const termsHeader = termsRaw[0]
const terms = termsRaw.slice(1)

const tsvRaw = fs
  .readFileSync(path.join(textDir, 'tune.3.tsv'), 'utf-8')
  .split('\n')

const tsvHeader = tsvRaw[0]
const tsvLines = tsvRaw.slice(1).filter(l => l.trim())

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
  path.join(textDir, '3-terms.csv'),
  [termsHeader, ...remainingTerms].join('\n') + '\n',
)

fs.writeFileSync(
  path.join(textDir, 'tune.3.tsv'),
  [tsvHeader, ...remainingTsv].join('\n') + '\n',
)

fs.writeFileSync(
  path.join(textDir, 'tune.3.done.tsv'),
  [tsvHeader, ...doneLines].join('\n') + '\n',
)

console.log(`Matched: ${matched.size}`)
console.log(`Remaining in 3-terms.csv: ${remainingTerms.length}`)
console.log(`Remaining in tune.3.tsv: ${remainingTsv.length}`)
console.log(`Written to tune.3.done.tsv: ${doneLines.length}`)
