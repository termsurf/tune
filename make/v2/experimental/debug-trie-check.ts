/**
 * Check which close variants of desired words exist in the trie
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadComboTrie, hasWord } from '../code/trie'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../../../base/v2/data')
const { trie, count } = loadComboTrie(dataDir)
console.log(`Trie: ${count} words\n`)

const CONSONANTS = 'mnqgdbptksfvzjxcClrwy'.split('')
const VOWELS = ['i', 'e', 'a', 'o', 'u']

function checkVariants(base: string, label: string) {
  console.log(`=== ${label}: looking for variants of "${base}" ===`)
  const [c1, v1, c2, v2, c3] = base.split('')
  const found: Array<string> = []

  /** Check exact. */
  if (hasWord(trie, base)) found.push(`${base} (exact)`)

  /** Single substitutions. */
  for (const v of VOWELS) {
    const w1 = c1 + v + c2 + v2 + c3
    if (hasWord(trie, w1) && w1 !== base) found.push(`${w1} (V1=${v})`)
    const w2 = c1 + v1 + c2 + v + c3
    if (hasWord(trie, w2) && w2 !== base) found.push(`${w2} (V2=${v})`)
  }
  for (const c of CONSONANTS) {
    const w1 = c + v1 + c2 + v2 + c3
    if (hasWord(trie, w1) && w1 !== base) found.push(`${w1} (C1=${c})`)
    const w2 = c1 + v1 + c + v2 + c3
    if (hasWord(trie, w2) && w2 !== base) found.push(`${w2} (C2=${c})`)
    const w3 = c1 + v1 + c2 + v2 + c
    if (hasWord(trie, w3) && w3 !== base) found.push(`${w3} (C3=${c})`)
  }

  if (found.length === 0) {
    console.log(`  No single-sub variants found!`)
    /** Try 2-sub: change V1+V2. */
    for (const va of VOWELS) {
      for (const vb of VOWELS) {
        const w = c1 + va + c2 + vb + c3
        if (hasWord(trie, w)) found.push(`${w} (V1=${va},V2=${vb})`)
      }
    }
    if (found.length === 0) {
      console.log(`  No V1+V2 variants either!`)
    }
  }

  for (const f of found.slice(0, 20)) {
    console.log(`  ${f}`)
  }
  console.log()
}

/** elephant: want l_f_n or l_f_t */
checkVariants('lafan', 'elephant (lafan)')
checkVariants('lafat', 'elephant (lafat)')
checkVariants('lefan', 'elephant (lefan)')
checkVariants('lefat', 'elephant (lefat)')
checkVariants('lofan', 'elephant (lofan)')

/** grease: want g_r_s */
checkVariants('goris', 'grease (goris)')
checkVariants('giras', 'grease (giras)')
checkVariants('giris', 'grease (giris)')
checkVariants('geros', 'grease (geros)')
checkVariants('geris', 'grease (geris)')

/** turtle: want t_t_l */
checkVariants('tutal', 'turtle (tutal)')
checkVariants('total', 'turtle (total)')
checkVariants('totel', 'turtle (totel)')

/** melon: want m_l_n */
checkVariants('malon', 'melon (malon)')

/** weasel: want w_z_l */
checkVariants('wizal', 'weasel (wizal)')
