/**
 * The six splits of 4,096 worth having, each in its own folder.
 *
 *   CVC    CVCC   CCVC   ratio
 *   1280   1536   1280   5:6:5 = 16
 *   1024   1792   1280   4:7:5 = 16
 *   1024   2048   1024   1:2:1 = 4
 *   1536   1280   1280   6:5:5 = 16
 *   1536   1792    768   6:7:3 = 16
 *   1536   1536   1024   3:3:2 = 8
 *
 * Every one is 4,096 words, so a base word is twelve bits whichever is
 * chosen. What differs is how the language spends those bits across its
 * three shapes.
 *
 * ── why one sweep answers all six ──────────────────────
 *
 * The three shapes never interact, so the question "what can `CVC`
 * come to" has one answer that every ratio then reads off. This sweeps
 * each shape ONCE, recording the cheapest way to reach every total it
 * can reach, and the six ratios are six lookups in that table rather
 * than six searches.
 *
 * ── what it may turn ───────────────────────────────────
 *
 *   pools     how many openings, closings, onset and coda clusters
 *   bar       a family refused at one slot of one shape
 *   ration    a family keeping only a share of its openings, which is
 *             the half and half version of a bar
 *   echo      no word opens and closes on two similar consonants
 *   sieve     an even thinning by rank sum
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/ratio.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { SHAPES, compareWords, type Shape } from './sound'
import { run, tally, withPlan, type Echo, type Plan } from './plan'
import {
  HOUSE,
  MARKED_CODAS,
  MARKED_ONSETS,
  MARKED_SOUNDS,
  SOUND_RANK_MAP,
  opensOnLiquid,
} from './house'
import { PORTIONS, RULES, type Portion, type Rule } from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '../../../base/v4/4096')

const TARGET = 4096

type Ratio = {
  name: string
  cvc: number
  cvcc: number
  ccvc: number
  says: string
  liked?: boolean
}

const RATIOS: Array<Ratio> = [
  { name: '5-6-5', cvc: 1280, cvcc: 1536, ccvc: 1280, says: '5:6:5 = 16' },
  /**
   * 4:7:5 is not here, and that is deliberate.
   *
   * It is the split that was settled on, and `keep.ts` owns it, because
   * it is built to hold every hand written meaning rather than to be
   * found by a search. Two generators writing one folder is how a
   * folder ends up holding whichever ran last.
   */
  { name: '1-2-1', cvc: 1024, cvcc: 2048, ccvc: 1024, says: '1:2:1 = 4' },
  { name: '6-5-5', cvc: 1536, cvcc: 1280, ccvc: 1280, says: '6:5:5 = 16' },
  { name: '6-7-3', cvc: 1536, cvcc: 1792, ccvc: 768, says: '6:7:3 = 16' },
  { name: '3-3-2', cvc: 1536, cvcc: 1536, ccvc: 1024, says: '3:3:2 = 8' },
]

for (const ratio of RATIOS) {
  const sum = ratio.cvc + ratio.cvcc + ratio.ccvc
  if (sum !== TARGET) {
    throw new Error(`${ratio.name} sums to ${sum}, not ${TARGET}`)
  }
}

/**
 * **No echo.** The echo rule refuses a word that opens and closes on
 * the same or a similar consonant, which sounds tidy and is wrong:
 * `mam`, `pap`, `tat`, `dad` are among the most important words any
 * language has, and a rule that cannot say them has cut into the bone
 * to save a few hundred words it did not need to save.
 *
 * Kept in `plan.ts` because it is a real option, and never reached for
 * here.
 */
const ECHOES: Array<Echo> = ['none']

type Sieve = { mod: number; keep: Array<number> } | null

const SIEVES: Array<Sieve> = [null]
for (let mod = 2; mod <= 6; mod++) {
  for (let keep = 1; keep < mod; keep++) {
    SIEVES.push({ mod, keep: Array.from({ length: keep }, (_, i) => i) })
  }
}

function order(list: Array<string>, first: Array<string>): Array<string> {
  const marked = list
    .filter(c => first.includes(c))
    .sort((a, b) => first.indexOf(a) - first.indexOf(b))
  return [...marked, ...[...list].reverse().filter(c => !first.includes(c))]
}

const openOrder = order(HOUSE.open, MARKED_SOUNDS)
const closeOrder = order(HOUSE.close, MARKED_SOUNDS)
const onsetOrder = order(HOUSE.onset, MARKED_ONSETS)
const liquidOrder = order(HOUSE.coda.filter(opensOnLiquid), MARKED_CODAS)
const otherOrder = order(HOUSE.coda.filter(c => !opensOnLiquid(c)), MARKED_CODAS)

function keepFrom(pool: Array<string>, dropped: Array<string>): Array<string> {
  const gone = new Set(dropped)
  return pool.filter(c => !gone.has(c))
}

/**
 * A way of reaching a number, and the only things it is allowed to be.
 *
 * **No pools are trimmed.** "Three closings go" removes sounds from the
 * language, which is the thing these ratios exist to avoid. Every
 * opening, closing and cluster v4 lists stays listed.
 *
 * **No bars and no echo.** Both say never.
 *
 * What is left is one ration per slot, so several small preferences
 * work together rather than one big refusal, plus a sieve to close the
 * last gap.
 */
type Way = {
  portions: Array<Portion>
  sieve: Sieve
  moved: number
}

function planOf(shape: Shape, way: Way): Plan {
  return withPlan(HOUSE, {
    ration: way.portions.map(p => p.ration),
    sieve: way.sieve ? { ...way.sieve, rank: SOUND_RANK_MAP } : null,
    shapes: [shape],
  })
}

function says(way: Way): string {
  const parts = way.portions.map(p => p.says)
  if (way.sieve) {
    parts.push(
      `an even sieve keeping ${way.sieve.keep.length} of ${way.sieve.mod}`,
    )
  }
  return parts.join('; ') || 'nothing turned'
}

// ─── Sweep Each Shape Once ──────────────────────────────

const liquidCount = HOUSE.coda.filter(opensOnLiquid).length
const otherCount = HOUSE.coda.length - liquidCount

const reach: Record<Shape, Map<number, Way>> = {
  CVC: new Map(),
  CVCC: new Map(),
  CCVC: new Map(),
}

const started = Date.now()

for (const shape of SHAPES) {
  const mine = PORTIONS.filter(p => p.ration.shape === shape)

  /**
   * Grouped by slot, so a combination is at most one preference per
   * slot. That is what "several rules working together" means here:
   * the opening leans one way and the closing another, rather than a
   * single rule doing all the work.
   */
  const bySlot = new Map<number, Array<Portion>>()
  for (const portion of mine) {
    const at = portion.ration.at
    const list = bySlot.get(at)
    if (list) {
      list.push(portion)
    } else {
      bySlot.set(at, [portion])
    }
  }

  const slots = [...bySlot.keys()].sort((a, b) => a - b)

  /** Every choice of one portion per slot, or none at that slot. */
  function choose(at: number, picked: Array<Portion>) {
    if (at === slots.length) {
      for (const sieve of SIEVES) {
        const way: Way = {
          portions: [...picked],
          sieve,
          moved: picked.length + (sieve ? 1 : 0),
        }
        const got = tally(planOf(shape, way), shape)
        const had = reach[shape].get(got)
        if (!had || way.moved < had.moved) {
          reach[shape].set(got, way)
        }
      }
      return
    }

    choose(at + 1, picked)
    for (const portion of bySlot.get(slots[at]) ?? []) {
      picked.push(portion)
      choose(at + 1, picked)
      picked.pop()
    }
  }

  choose(0, [])

  console.log(
    `${shape} can reach ${reach[shape].size.toLocaleString()} totals ` +
      `using only ratios, across ${slots.length} slots`,
  )
}

console.log('')
console.log(`swept in ${((Date.now() - started) / 1000).toFixed(1)}s`)
console.log('')

// ─── Write Each Ratio ───────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const index: Array<string> = ['folder,ratio,cvc,cvcc,ccvc,all,lean,reachable']

console.log('| folder | ratio | CVC | CVCC | CCVC | lean | reachable |')
console.log('| :--- | :--- | ---: | ---: | ---: | ---: | :--- |')

for (let i = 0; i < RATIOS.length; i++) {
  const ratio = RATIOS[i]
  const nn = String(i + 1).padStart(2, '0')
  const folder = `${nn}-${ratio.name}`

  const want: Record<Shape, number> = {
    CVC: ratio.cvc,
    CVCC: ratio.cvcc,
    CCVC: ratio.ccvc,
  }

  const ways: Partial<Record<Shape, Way>> = {}
  let ok = true
  for (const shape of SHAPES) {
    const way = reach[shape].get(want[shape])
    if (!way) {
      ok = false
      break
    }
    ways[shape] = way
  }

  if (!ok) {
    console.log(
      `| ${folder} | ${ratio.says} | ${ratio.cvc} | ${ratio.cvcc} | ` +
        `${ratio.ccvc} | | **not reachable** |`,
    )
    index.push(
      [folder, ratio.says, ratio.cvc, ratio.cvcc, ratio.ccvc, TARGET, '', 'no'].join(','),
    )
    continue
  }

  const dir = resolve(OUT_DIR, folder)
  let lean = 0

  for (const shape of SHAPES) {
    const { full, count } = run(planOf(shape, ways[shape] as Way))
    if (count.full[shape] !== want[shape]) {
      throw new Error(`${folder}/${shape} built ${count.full[shape]}`)
    }
    lean += count.lean[shape]

    const words = [...full[shape]].map(p => p.word).sort(compareWords)
    write(
      resolve(dir, `${shape.toLowerCase()}.csv`),
      ['word', ...words].join('\n') + '\n',
    )
  }

  write(
    resolve(dir, 'plan.csv'),
    [
      'shape,count,how',
      ...SHAPES.map(s => `${s},${want[s]},"${says(ways[s] as Way)}"`),
    ].join('\n') + '\n',
  )

  write(
    resolve(dir, 'readme.md'),
    [
      `# ${ratio.says}`,
      '',
      ratio.liked
        ? '**The one leaned toward.** '
        : '',
      `\`\`\`text`,
      `CVC   ${ratio.cvc}`,
      `CVCC  ${ratio.cvcc}`,
      `CCVC  ${ratio.ccvc}`,
      `      ${TARGET} = 2^12, so a base word is twelve bits`,
      `\`\`\``,
      '',
      'How each shape reaches its number:',
      '',
      ...SHAPES.map(s => `- **${s}** at ${want[s]}: ${says(ways[s] as Way)}`),
      '',
      '## What the words mean',
      '',
      '**A ratio, never a ban.** Nothing here says a sound may not stand',
      'somewhere. A rule like "c or C opens a quarter of the words they',
      'could" leaves `c` and `C` free everywhere else, and free in that',
      'slot too, just less often. The whole inventory survives and every',
      'sound reaches a word.',
      '',
      '**A sieve is an even thinning.** Every sound has a fixed number,',
      'its place in the tone order from `code/phonology.ts`. Add up the',
      "numbers of a word's sounds and divide by some small number, and",
      'the remainder is what the sieve reads. "Keeping 4 of 5" means a',
      'word stays when that remainder is 0, 1, 2 or 3, and goes when it',
      'is 4, so four words in five survive.',
      '',
      'It is there because rules about sounds land on round-ish numbers',
      'and rarely on the exact one wanted. The sieve closes the last gap',
      'without favouring any sound, because the remainder has nothing to',
      'do with which sounds a word holds. Every opening, closing and',
      'cluster loses the same share.',
      '',
      '**Nothing is random.** The remainder is a property of the word',
      'itself, so the same word is kept or dropped on every run, on any',
      'machine. Rebuilding gives the identical list.',
      '',
      '**No echo rule is used.** That rule refuses a word opening and',
      'closing on the same or a similar consonant, and it would cost',
      '`mam`, `pap`, `tat` and `dad`, which are words a language cannot',
      'do without.',
      '',
      `After the closeness pass, ${lean} words stay distinct.`,
      '',
      'Rebuild with `pnpm --dir deck/tune exec tsx make/v4/code/ratio.ts`.',
    ].join('\n') + '\n',
  )

  index.push(
    [folder, ratio.says, ratio.cvc, ratio.cvcc, ratio.ccvc, TARGET, lean, 'yes'].join(','),
  )

  console.log(
    `| ${folder} | ${ratio.says} | ${ratio.cvc} | ${ratio.cvcc} | ` +
      `${ratio.ccvc} | ${lean} | yes${ratio.liked ? ' **(leaned toward)**' : ''} |`,
  )
}

write(resolve(OUT_DIR, 'ratio.csv'), index.join('\n') + '\n')

console.log('')
console.log(`wrote ${OUT_DIR}`)
