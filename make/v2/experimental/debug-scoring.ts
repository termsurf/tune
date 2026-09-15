/**
 * Debug script: trace scoring for specific words
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ipaToTuneCandidates } from '../code/talk-to-tune'
import { loadComboTrie, hasWord } from '../code/trie'
import { walkTrieForMatches } from '../code/trie-match'
import { wordPhoneticDistance } from '../code/similarity'

const __dirname = dirname(fileURLToPath(import.meta.url))

const testWords: Array<{ english: string; ipa: string; expected: string }> = [
  { english: 'elephant', ipa: 'ˈɛləfənt', expected: 'lafan' },
  { english: 'grease', ipa: 'ɡɹiːs', expected: 'goris' },
  { english: 'fox', ipa: 'fɒks', expected: 'fakis' },
  { english: 'turtle', ipa: 'ˈtɜːɹtəl', expected: 'tutal' },
  { english: 'melon', ipa: 'ˈmɛlən', expected: 'malon' },
  { english: 'weasel', ipa: 'ˈwiːzəl', expected: 'wizal' },
  { english: 'vacuum', ipa: 'ˈvækjuːm', expected: 'vakum' },
  { english: 'glacier', ipa: 'ˈɡleɪʃəɹ', expected: 'gexar' },
  { english: 'granite', ipa: 'ˈɡɹænɪt', expected: 'ganit' },
  { english: 'grass', ipa: 'ɡɹæs', expected: 'garas' },
  { english: 'spider', ipa: 'ˈspaɪdər', expected: 'pador' },
  { english: 'cabbage', ipa: 'ˈkæbɪdʒ', expected: 'kabaj' },
  { english: 'venus', ipa: 'ˈviːnəs', expected: 'vinas' },
  { english: 'cedar', ipa: 'ˈsiːdər', expected: 'sidar' },
]

const dataDir = resolve(__dirname, '../../../base/v2/data')
const { trie, count } = loadComboTrie(dataDir)
console.log(`Trie: ${count} words\n`)

for (const tw of testWords) {
  console.log(`=== ${tw.english} (${tw.ipa}) ===`)
  console.log(`  Expected: ${tw.expected}`)

  const candidates = ipaToTuneCandidates(tw.ipa, 50)
  console.log(`  Top 5 raw candidates:`)
  for (const c of candidates.slice(0, 5)) {
    console.log(`    ${c.word} (total=${c.total})`)
  }

  const matches = walkTrieForMatches(trie, candidates, 200)
  console.log(`  Top 10 trie matches (of ${matches.length}):`)
  for (const m of matches.slice(0, 10)) {
    console.log(`    ${m.word} adj=${m.adjustedScore.toFixed(1)} dist=${m.distance} tier=${m.tier} type=${m.matchType}`)
  }
  /** Check specific words. */
  for (const check of ['geron', 'gerus', 'lifas', 'lavot']) {
    const m = matches.find(x => x.word === check)
    if (m) {
      const idx = matches.indexOf(m)
      console.log(`  >> ${check} at rank #${idx + 1}: adj=${m.adjustedScore.toFixed(1)} dist=${m.distance}`)
    }
  }

  /** Check if expected word is in matches at all. */
  const expectedMatch = matches.find(m => m.word === tw.expected)
  if (expectedMatch) {
    const idx = matches.indexOf(expectedMatch)
    console.log(`  Expected "${tw.expected}" found at rank #${idx + 1}: adj=${expectedMatch.adjustedScore.toFixed(1)}`)
  } else {
    /** Check if it's in trie. */
    if (hasWord(trie, tw.expected)) {
      /** Compute distance to see why it wasn't selected. */
      let bestDist = Infinity
      for (const c of candidates.slice(0, 5)) {
        const d = wordPhoneticDistance(c.word, tw.expected)
        if (d < bestDist) bestDist = d
      }
      console.log(`  Expected "${tw.expected}" IN TRIE but NOT in matches! bestDist=${bestDist}`)
    } else {
      console.log(`  Expected "${tw.expected}" NOT IN TRIE`)
    }
  }
  console.log()
}
