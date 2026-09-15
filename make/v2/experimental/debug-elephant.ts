/**
 * Minimal trace for elephant scoring discrepancy
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ipaToTuneCandidates } from '../code/talk-to-tune'
import { loadComboTrie, hasWord } from '../code/trie'
import { walkTrieForMatches } from '../code/trie-match'
import { wordPhoneticDistance } from '../code/similarity'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../../../base/v2/data')
const { trie } = loadComboTrie(dataDir)

const ipa = 'ˈɛləfənt'
const candidates = ipaToTuneCandidates(ipa, 50)

console.log(`Raw candidates (all ${candidates.length}):`)
for (const c of candidates) {
  console.log(`  ${c.word} total=${c.total}`)
}

console.log(`\nDoes 'lifas' exist in trie? ${hasWord(trie, 'lifas')}`)

const matches = walkTrieForMatches(trie, candidates, 200)

console.log(`\nMatch list for 'lifas':`)
const m = matches.find(x => x.word === 'lifas')
if (m) {
  const idx = matches.indexOf(m)
  console.log(`  rank #${idx + 1}: adj=${m.adjustedScore} dist=${m.distance} total=${m.total}`)

  /** Verify by computing distance manually. */
  for (const c of candidates) {
    const d = wordPhoneticDistance(c.word, 'lifas')
    if (d <= 10) {
      console.log(`  candidate ${c.word} (total=${c.total}) -> dist=${d} to lifas`)
    }
  }
}

console.log(`\nTop 5 matches:`)
for (const m2 of matches.slice(0, 5)) {
  console.log(`  ${m2.word} adj=${m2.adjustedScore} dist=${m2.distance} total=${m2.total}`)
}
