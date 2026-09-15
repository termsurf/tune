/**
 * Rock carried back to Tree.
 *
 * Rock is Tree with its final vowels gone and its consonants split
 * four ways. Folding Rock back means undoing both:
 *
 *   Rock  bat   ->   Tree  pata
 *   Rock  mis   ->   Tree  mita
 *
 * The sounds map one to one going back, because every Rock sound has
 * exactly one Tree ancestor. What cannot be recovered is the vowel
 * Rock dropped off the end, so every reconstruction says so.
 *
 * Tree does not compound. A Rock word of two atoms is therefore two
 * Tree words, not one, and that is how it is written out.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/rock/code/fold.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  ANCESTOR,
  DESCENDANTS,
  VOWELS,
  compareWords,
  testRoot,
} from '#/make/v3/rock/code/sound'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(__dirname, '../base')
const ROCK_DIR = resolve(__dirname, '../../rock/base')

/** The neutral vowel first. Tree leans on `a` when nothing decides. */
const VOWEL_PREFERENCE = ['a', 'u', 'i']

export type Fold = {
  tree: string | null
  certainty: 'held' | 'strained'
  reason: string
}

/**
 * One Rock atom back to one Tree root.
 *
 * Every Rock sound has one Tree ancestor, so the consonants and the
 * vowel come back with no choice involved. The only guess is the vowel
 * Rock dropped off the end, which is tried neutral first.
 */
export function fold(atom: string): Fold {
  let sounds = ''
  for (const sound of atom) {
    const ancestor = ANCESTOR[sound]
    if (!ancestor) {
      return {
        tree: null,
        certainty: 'held',
        reason: 'sound is not Rock',
      }
    }
    sounds += ancestor
  }

  for (const vowel of VOWEL_PREFERENCE) {
    const root = sounds + vowel
    if (testRoot(root).ok) {
      return { tree: root, certainty: 'held', reason: '' }
    }
  }

  /** No ending Tree allows. Keep the neutral one and say it is a
   * shape Tree would not have had. */
  return {
    tree: sounds + VOWEL_PREFERENCE[0],
    certainty: 'strained',
    reason: 'no ending fits Tree',
  }
}

/** Every Rock atom a Tree root could have become. */
export function sprout(root: string): Array<string> {
  const kept = root.slice(0, -1)
  let words: Array<string> = ['']
  for (const sound of kept) {
    const next: Array<string> = []
    for (const word of words) {
      for (const { talk } of DESCENDANTS[sound] ?? []) {
        next.push(word + talk)
      }
    }
    words = next
  }
  return words.sort(compareWords)
}

// ─── Reading ────────────────────────────────────────────

function splitRow(row: string): Array<string> {
  const cell: Array<string> = []
  let current = ''
  let quoted = false
  for (const ch of row) {
    if (ch === '"') {
      quoted = !quoted
    } else if (ch === ',' && !quoted) {
      cell.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cell.push(current)
  return cell
}

function readWords(path: string): Set<string> {
  if (!existsSync(path)) {
    return new Set()
  }
  return new Set(
    readFileSync(path, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && l !== 'word'),
  )
}

function line(text: string) {
  console.log(text)
}

function rule(title: string) {
  line(`\n${'='.repeat(60)}`)
  line(title)
  line('='.repeat(60))
}

// ─── Run ────────────────────────────────────────────────

rule('SOUND CHANGE, TREE TO ROCK')
line('')
for (const tree of Object.keys(DESCENDANTS)) {
  const kids = DESCENDANTS[tree]
  if (kids.length === 0) {
    line(`  ${tree} -> lost`)
    continue
  }
  line(
    `  ${tree} -> ${kids
      .map(d => `${d.talk} (${d.change})`)
      .join(', ')}`,
  )
}

rule('CARRYING ROCK BACK TO TREE')

const ancestorPath = resolve(ROCK_DIR, 'ancestor.csv')
if (!existsSync(ancestorPath)) {
  line('\n  rock/base/ancestor.csv not found')
  line('  run: pnpm --dir deck/tune exec tsx make/rock/code/fold.ts')
  process.exit(1)
}

const rows = readFileSync(ancestorPath, 'utf-8')
  .split('\n')
  .filter(l => l.trim().length > 0)

const header = splitRow(rows[0])
const iRock = header.indexOf('rock')
const iMoon = header.indexOf('moon')
const iEnglish = header.indexOf('english')

const treeRoots = new Set([
  ...readWords(resolve(BASE_DIR, 'root', '4.csv')),
])

const out: Array<string> = ['tree,certainty,words,rock,moon,english']
const certainty: Record<string, number> = {}
const wordCount: Record<number, number> = {}
const claimed = new Map<string, Array<string>>()
const usedRoots = new Set<string>()
let missed = 0
let offList = 0

for (const row of rows.slice(1)) {
  const cell = splitRow(row)
  const rockWord = cell[iRock]
  if (!rockWord) {
    continue
  }

  const atoms = rockWord.split('.')
  const roots: Array<string> = []
  let worst: 'held' | 'strained' = 'held'
  let failed = false

  for (const atom of atoms) {
    const result = fold(atom)
    if (!result.tree) {
      failed = true
      break
    }
    if (result.certainty === 'strained') {
      worst = 'strained'
    }
    roots.push(result.tree)
  }

  if (failed) {
    missed++
    continue
  }

  certainty[worst] = (certainty[worst] ?? 0) + 1
  wordCount[roots.length] = (wordCount[roots.length] ?? 0) + 1

  for (const root of roots) {
    usedRoots.add(root)
    if (!treeRoots.has(root)) {
      offList++
    }
  }

  const key = roots.join(' ')
  const holders = claimed.get(key) ?? []
  holders.push(cell[iEnglish])
  claimed.set(key, holders)

  out.push(
    [
      key,
      worst,
      String(roots.length),
      rockWord,
      cell[iMoon],
      cell[iEnglish],
    ]
      .map(c => ((c ?? '').includes(',') ? `"${c}"` : c ?? ''))
      .join(','),
  )
}

const head = out[0]
const body = out.slice(1).sort((a, b) => {
  const x = splitRow(a)[0]
  const y = splitRow(b)[0]
  return x.length - y.length || x.localeCompare(y)
})

mkdirSync(BASE_DIR, { recursive: true })
writeFileSync(
  resolve(BASE_DIR, 'ancestor.csv'),
  [head, ...body].join('\n') + '\n',
)

line(
  `\n  ${(
    out.length - 1
  ).toLocaleString()} Rock words carried back to Tree`,
)
line(`  ${missed.toLocaleString()} could not be carried back`)
line(
  `  ${usedRoots.size.toLocaleString()} of ${treeRoots.size.toLocaleString()} two syllable Tree roots are in use (${(
    (usedRoots.size / Math.max(1, treeRoots.size)) *
    100
  ).toFixed(0)}%)`,
)
line(
  `  ${[...claimed.values()]
    .filter(v => v.length > 1)
    .length.toLocaleString()} Tree readings carry more than one meaning`,
)
line(
  `  ${offList.toLocaleString()} reconstructed roots are not in base/root/4.csv`,
)

line('\n  how sure the reconstruction is:')
for (const name of ['held', 'strained']) {
  line(
    `    ${name.padEnd(10)} ${String(certainty[name] ?? 0).padStart(
      5,
    )}`,
  )
}

line('\n  how many Tree words the Rock word came back as:')
for (const n of Object.keys(wordCount)
  .map(Number)
  .sort((a, b) => a - b)) {
  const note =
    n > 1 ? '  Tree does not compound, so this is a phrase' : ''
  line(`    ${n} word  ${String(wordCount[n]).padStart(5)}${note}`)
}

line('\n  sample:')
for (const row of body.slice(0, 14)) {
  const cell = splitRow(row)
  line(
    `    ${cell[0].padEnd(14)} <- ${cell[3].padEnd(
      10,
    )} <- ${cell[4].padEnd(9)} ${cell[5]}`,
  )
}

line(`\n  wrote base/ancestor.csv`)
