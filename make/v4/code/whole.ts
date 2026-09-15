/**
 * 4,096 with the whole inventory kept.
 *
 * `twelve.ts` reaches the number by taking sounds and clusters OUT of
 * the pools, which shrinks the language. This reaches it the other way.
 *
 * **All 22 consonants and all 5 vowels stay, and every one of them
 * reaches a word.** Nothing is dropped. The language is thinned by
 * rules about WHERE a sound may stand, each of which is a sentence
 * somebody could say:
 *
 *   a three letter word never opens on a hush
 *   a word opening on a cluster never closes on a nasal
 *   a closing cluster never has a liquid in its first slot
 *
 * A rule refuses a family at one slot of one shape, so the family is
 * still free everywhere else and no sound is lost. Two more knobs sit
 * behind the rules for when they alone overshoot:
 *
 *   echo   a word may not open and close on the same consonant, or on
 *          two from one similarity group, which is the rule Semitic
 *          roots follow
 *   sieve  keeps a word when its sounds' ranks sum, modulo m, to one of
 *          the residues kept, cutting evenly across everything
 *
 * ── How the search stays fast ───────────────────────────
 *
 * The naive sweep is every rule subset times every echo times every
 * sieve, building and pruning a whole language each time. That is
 * hours. Two facts collapse it to about a second.
 *
 * **A rule touches ONE shape.** So a subset of the catalogue splits
 * into three independent subsets, one per shape, and the total is the
 * sum of three counts that never interact. Counting every shape and
 * subset once and then adding them up in triples replaces tens of
 * thousands of whole-language builds with a few hundred shape counts.
 *
 * **A count needs no words.** `tally` in `plan.ts` does the same
 * arithmetic on integers, with the rhyme rule as a bitmask per closing
 * and the sieve's rank sums lifted out of the vowel loop. `run` checks
 * it against the built list on every call, so the fast path cannot
 * drift away from the slow one.
 *
 * The closeness pass is the expensive half and it cannot change a
 * total, so it runs only on the handful that survive.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/whole.ts
 *   pnpm --dir deck/tune exec tsx make/v4/code/whole.ts --count 20
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import {
  CONSONANTS,
  SHAPES,
  VOWELS,
  compareWords,
  type Shape,
} from './sound'

import {
  coverage,
  run,
  tally,
  withPlan,
  type Echo,
  type Plan,
} from './plan'

import { HOUSE, SOUND_RANK_MAP } from './house'
import { RULES, type Rule } from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '../../../base/v4/4096/02-bar-positions')

const TARGET = 4096
const INVENTORY = [...CONSONANTS, ...VOWELS]
const MOST_RULES = 3

const args = process.argv.slice(2)
const countAt = args.indexOf('--count')
const WANT = countAt >= 0 ? Number(args[countAt + 1]) : 10

const ECHOES: Array<Echo> = ['none', 'same', 'similar']

type Sieve = { mod: number; keep: Array<number> } | null

const SIEVES: Array<Sieve> = [null]
for (let mod = 2; mod <= 8; mod++) {
  for (let keep = 1; keep < mod; keep++) {
    SIEVES.push({
      mod,
      keep: Array.from({ length: keep }, (_, i) => i),
    })
  }
}

function planOf(rules: Array<Rule>, echo: Echo, sieve: Sieve): Plan {
  return withPlan(HOUSE, {
    name: rules.map(r => r.name).join('+') || 'bare',
    note: rules.map(r => r.says).join('; '),
    bar: rules.map(r => r.bar),
    echo,
    sieve: sieve ? { ...sieve, rank: SOUND_RANK_MAP } : null,
  })
}

// ─── Where It Starts ────────────────────────────────────

const base = run(HOUSE)
const baseCover = coverage(HOUSE, base.full, INVENTORY)

console.log('With nothing barred and nothing dropped:')
console.log(
  `  CVC ${base.count.full.CVC}, CVCC ${base.count.full.CVCC}, ` +
    `CCVC ${base.count.full.CCVC}, all ${base.count.fullAll}`,
)
console.log(
  `  every sound reaches a word: ` +
    `${baseCover.whole ? 'yes' : 'no, missing ' + baseCover.sound.join(' ')}`,
)
console.log(`  ${base.count.fullAll - TARGET} to cut to reach ${TARGET}`)
console.log('')

// ─── Per Shape, Once ────────────────────────────────────

const byShape = new Map<Shape, Array<Rule>>()
for (const shape of SHAPES) {
  byShape.set(
    shape,
    RULES.filter(r => r.bar.shape === shape),
  )
}

/** Subsets of one shape's rules, up to the cap. */
function subsets(list: Array<Rule>): Array<Array<Rule>> {
  const out: Array<Array<Rule>> = [[]]
  function walk(at: number, picked: Array<Rule>) {
    if (picked.length === MOST_RULES) {
      return
    }
    for (let i = at; i < list.length; i++) {
      picked.push(list[i])
      out.push([...picked])
      walk(i + 1, picked)
      picked.pop()
    }
  }
  walk(0, [])
  return out
}

const shapeSubsets = new Map<Shape, Array<Array<Rule>>>()
for (const shape of SHAPES) {
  shapeSubsets.set(shape, subsets(byShape.get(shape) ?? []))
}

const started = Date.now()
let tallies = 0

/** counts[echo][sieve][shape][subset] */
const counts = new Map<string, Map<Shape, Array<number>>>()

for (const echo of ECHOES) {
  for (let si = 0; si < SIEVES.length; si++) {
    const key = `${echo}|${si}`
    const perShape = new Map<Shape, Array<number>>()
    for (const shape of SHAPES) {
      const subs = shapeSubsets.get(shape) ?? []
      const row: Array<number> = []
      for (const rules of subs) {
        row.push(tally(planOf(rules, echo, SIEVES[si]), shape))
        tallies++
      }
      perShape.set(shape, row)
    }
    counts.set(key, perShape)
  }
}

console.log(
  `counted ${tallies.toLocaleString()} shape and rule pairs in ` +
    `${Date.now() - started}ms`,
)
console.log('')

// ─── Combine ────────────────────────────────────────────

type Found = {
  rules: Array<Rule>
  echo: Echo
  sieve: Sieve
  parts: number
}

const found: Array<Found> = []

for (const echo of ECHOES) {
  for (let si = 0; si < SIEVES.length; si++) {
    const perShape = counts.get(`${echo}|${si}`)
    if (!perShape) continue

    const cvcSubs = shapeSubsets.get('CVC') ?? []
    const cvccSubs = shapeSubsets.get('CVCC') ?? []
    const ccvcSubs = shapeSubsets.get('CCVC') ?? []
    const cvcRow = perShape.get('CVC') ?? []
    const cvccRow = perShape.get('CVCC') ?? []
    const ccvcRow = perShape.get('CCVC') ?? []

    for (let a = 0; a < cvcSubs.length; a++) {
      const nA = cvcSubs[a].length
      if (nA > MOST_RULES) continue
      for (let b = 0; b < cvccSubs.length; b++) {
        const nB = nA + cvccSubs[b].length
        if (nB > MOST_RULES) continue
        const partial = cvcRow[a] + cvccRow[b]
        if (partial > TARGET) continue
        for (let c = 0; c < ccvcSubs.length; c++) {
          if (nB + ccvcSubs[c].length > MOST_RULES) continue
          if (partial + ccvcRow[c] !== TARGET) continue
          found.push({
            rules: [...cvcSubs[a], ...cvccSubs[b], ...ccvcSubs[c]],
            echo,
            sieve: SIEVES[si],
            parts:
              cvcSubs[a].length +
              cvccSubs[b].length +
              ccvcSubs[c].length +
              (echo === 'none' ? 0 : 1) +
              (SIEVES[si] ? 1 : 0),
          })
        }
      }
    }
  }
}

found.sort((a, b) => a.parts - b.parts)

console.log(
  `${found.length} ways to reach exactly ${TARGET} with the whole ` +
    `inventory kept, found in ${Date.now() - started}ms`,
)
console.log('')

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const index: Array<string> = ['variant,cvc,cvcc,ccvc,all,lean,echo,sieve,rules']

console.log('| n | CVC | CVCC | CCVC | all | lean | what it says |')
console.log('| ---: | ---: | ---: | ---: | ---: | ---: | :--- |')

let wrote = 0

for (const hit of found) {
  if (wrote >= WANT) {
    break
  }

  const plan = planOf(hit.rules, hit.echo, hit.sieve)
  const { full, count } = run(plan)
  const cover = coverage(plan, full, INVENTORY)

  /** Only now, on a handful, is coverage worth the build. */
  if (!cover.whole || !cover.pools) {
    continue
  }
  if (count.fullAll !== TARGET) {
    throw new Error(`built ${count.fullAll}, wanted ${TARGET}`)
  }

  wrote++
  const nn = String(wrote).padStart(2, '0')
  const dir = resolve(OUT_DIR, nn)

  for (const shape of SHAPES) {
    const words = [...full[shape]].map(p => p.word).sort(compareWords)
    write(
      resolve(dir, `${shape.toLowerCase()}.csv`),
      ['word', ...words].join('\n') + '\n',
    )
  }

  const sieveSays = hit.sieve
    ? `${hit.sieve.keep.join(' ')} of ${hit.sieve.mod}`
    : 'none'

  write(
    resolve(dir, 'plan.csv'),
    [
      'setting,value',
      `echo,${hit.echo}`,
      `sieve,${sieveSays}`,
      ...hit.rules.map(r => `rule,"${r.says}"`),
      `open,${plan.open.join(' ')}`,
      `close,${plan.close.join(' ')}`,
      `onset,${plan.onset.join(' ')}`,
      `coda,${plan.coda.join(' ')}`,
    ].join('\n') + '\n',
  )

  const says = hit.rules.map(r => r.says).join('; ') || 'no position rule'

  index.push(
    [
      nn,
      count.full.CVC,
      count.full.CVCC,
      count.full.CCVC,
      count.fullAll,
      count.leanAll,
      hit.echo,
      `"${sieveSays}"`,
      `"${says}"`,
    ].join(','),
  )

  const extra = [
    hit.echo !== 'none' ? `echo ${hit.echo}` : '',
    hit.sieve ? `sieve ${sieveSays}` : '',
  ]
    .filter(Boolean)
    .join('; ')

  console.log(
    `| ${nn} | ${count.full.CVC} | ${count.full.CVCC} | ${count.full.CCVC} | ` +
      `${count.fullAll} | ${count.leanAll} | ${says}${extra ? '; ' + extra : ''} |`,
  )
}

if (wrote > 0) {
  write(resolve(OUT_DIR, 'index.csv'), index.join('\n') + '\n')
  console.log('')
  console.log(`wrote ${OUT_DIR} in ${Date.now() - started}ms`)
} else {
  console.log('')
  console.log('nothing found, widen the catalogue in rule.ts')
}
