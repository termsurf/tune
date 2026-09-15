/**
 * English -> Tune CVCVC Mapper
 *
 * Maps English words (via IPA -> Talk -> Tune candidates) to
 * available CVCVC words from the combo trie.
 *
 * Pipeline:
 *   1. Load CVCVC trie from combo-{1,2,3,4}/5.csv
 *   2. For each English word: IPA -> Talk -> raw CVCVC candidates
 *   3. Walk trie guided by phonetic similarity to find matches
 *   4. Constraint-first global assignment (most constrained picks first)
 *
 * Usage:
 *   npx tsx map.ts --ipa data/english-ipa.csv
 *   npx tsx map.ts --talk data/english-talk.csv
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  talkToTuneCandidates,
  ipaToTuneCandidates,
} from '../code/talk-to-tune'
import { loadComboTrie } from '../code/trie'
import { walkTrieForMatches } from '../code/trie-match'
import {
  assignConstraintFirst,
  type EntryWithMatches,
} from '../code/assign'

const __dirname = dirname(fileURLToPath(import.meta.url))

function main() {
  const args = process.argv.slice(2)
  const talkIdx = args.indexOf('--talk')
  const ipaIdx = args.indexOf('--ipa')
  const outputIdx = args.indexOf('--output')

  const inputPath =
    talkIdx >= 0
      ? resolve(__dirname, args[talkIdx + 1])
      : ipaIdx >= 0
        ? resolve(__dirname, args[ipaIdx + 1])
        : null

  const outputPath =
    outputIdx >= 0
      ? resolve(__dirname, args[outputIdx + 1])
      : resolve(__dirname, '../../../base/v2/data/assignments.json')

  if (!inputPath) {
    console.error('Usage:')
    console.error('  npx tsx map.ts --ipa data/english-ipa.csv')
    console.error('  npx tsx map.ts --talk data/english-talk.csv')
    process.exit(1)
  }

  /** Load combo trie. */
  console.log('Loading combo trie...')
  const dataDir = resolve(__dirname, '../../../base/v2/data')
  const { trie, count } = loadComboTrie(dataDir)
  console.log(`  ${count} available CVCVC words`)

  /** Load input words. */
  console.log(`Loading input from ${inputPath}...`)
  const lines = readFileSync(inputPath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('english'))

  const entries: Array<EntryWithMatches> = []
  const useIpa = ipaIdx >= 0

  for (const line of lines) {
    const [english, phonetic] = line.split(',').map(s => s?.trim())
    if (!english || !phonetic) continue

    /** Generate raw CVCVC candidates from IPA/Talk. */
    const candidates = useIpa
      ? ipaToTuneCandidates(phonetic, 50)
      : talkToTuneCandidates(phonetic, 50)

    /** Walk trie to find available matches. */
    const matches = walkTrieForMatches(trie, candidates, 200)

    entries.push({ english, ipa: phonetic, talk: phonetic, matches })
  }

  console.log(`  ${entries.length} words loaded`)
  console.log(
    `  ${entries.filter(e => e.matches.length > 0).length} have trie matches`,
  )

  /** Constraint-first global assignment. */
  console.log('\nAssigning (constraint-first)...')
  const assignments = assignConstraintFirst(entries)

  /** Save JSON. */
  writeFileSync(outputPath, JSON.stringify(assignments, null, 2))
  console.log(`\n${assignments.length} assignments -> ${outputPath}`)

  /** Write CSV: tune word, english, ipa. */
  const csvPath = resolve(__dirname, '../../../base/v2/data/assignments.csv')
  const csvLines = assignments
    .sort((a, b) => a.tuneWord.localeCompare(b.tuneWord))
    .map(a => `${a.tuneWord},${a.english},${a.ipa}`)
  writeFileSync(csvPath, csvLines.join('\n') + '\n')
  console.log(`${assignments.length} assignments -> ${csvPath}`)

  /** Stats. */
  const tierCounts = [0, 0, 0, 0, 0]
  for (const a of assignments) tierCounts[a.tier]++
  console.log(`\nTier distribution:`)
  for (let i = 1; i <= 4; i++) {
    if (tierCounts[i] > 0) console.log(`  tier ${i}: ${tierCounts[i]}`)
  }

  const avgScore =
    assignments.length > 0
      ? (
          assignments.reduce((s, a) => s + a.score, 0) / assignments.length
        ).toFixed(1)
      : '0'
  console.log(`Avg score: ${avgScore}`)
}

main()
