import fs from 'fs'
import path from 'path'

const textDir = path.resolve(__dirname, '..', '..', '..', 'text')

const landforms = fs
  .readFileSync(path.join(textDir, 'head-landforms.csv'), 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean)

function extractMeanings(filePath: string): Set<string> {
  const meanings = new Set<string>()
  if (!fs.existsSync(filePath)) return meanings
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n')
  for (const line of lines) {
    const meaning = (line.split('\t')[2] || '').trim().toLowerCase()
    if (meaning) meanings.add(meaning)
  }
  return meanings
}

const done3 = extractMeanings(path.join(textDir, 'tune.3.done.tsv'))
const done4 = extractMeanings(path.join(textDir, 'tune.4.done.tsv'))

function isDone(term: string): boolean {
  const key = term.toLowerCase()
  for (const m of done3) {
    if (new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(m)) return true
  }
  for (const m of done4) {
    if (new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(m)) return true
  }
  return false
}

const remaining = landforms.filter(t => !isDone(t))
const removed = landforms.length - remaining.length

fs.writeFileSync(
  path.join(textDir, 'head-landforms.csv'),
  remaining.join('\n') + '\n',
)

console.log(`Removed: ${removed}`)
console.log(`Remaining: ${remaining.length}`)
