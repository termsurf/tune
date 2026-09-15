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
 * still free everywhere else and no sound is lost. Two more knobs are
 * available when the rules alone overshoot or undershoot:
 *
 *   echo   a word may not open and close on the same consonant, or on
 *          two from one similarity group, which is the rule Semitic
 *          roots follow
 *   sieve  keeps a word when its sounds' ranks sum, modulo m, to one of
 *          the residues kept, cutting evenly across everything
 *
 * Every candidate is checked for full coverage before it is reported,
 * so a variant here cannot quietly strand a sound or a cluster.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/whole.ts
 *   pnpm --dir deck/tune exec tsx make/v4/code/whole.ts --count 20
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { CONSONANTS, SHAPES, VOWELS, compareWords } from './sound'
import { coverage, run, withPlan, type Echo, type Plan } from './plan'
import { HOUSE, SOUND_RANK_MAP } from './house'
import { RULES, type Rule } from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(here, '../../../base/v4/4096/02-bar-positions')

const TARGET = 4096
const INVENTORY = [...CONSONANTS, ...VOWELS]

const args = process.argv.slice(2)
const countAt = args.indexOf('--count')
const WANT = countAt >= 0 ? Number(args[countAt + 1]) : 10

const ECHOES: Array<Echo> = ['none', 'same', 'similar']

// ─── Where It Starts ────────────────────────────────────

const base = run(HOUSE)
const baseCover = coverage(HOUSE, base.full, INVENTORY)

console.log('With nothing barred and nothing dropped:')
console.log(
  `  CVC ${base.count.full.CVC}, CVCC ${base.count.full.CVCC}, ` +
    `CCVC ${base.count.full.CCVC}, all ${base.count.fullAll}`,
)
console.log(
  `  every sound reaches a word: ${baseCover.whole ? 'yes' : 'no, missing ' + baseCover.sound.join(' ')}`,
)
console.log(`  ${base.count.fullAll - TARGET} to cut to reach ${TARGET}`)
console.log('')

// ─── Search ─────────────────────────────────────────────

type Found = {
  rules: Array<Rule>
  echo: Echo
  mod: number
  keep: Array<number>
  plan: Plan
  lean: number
}

function planOf(
  rules: Array<Rule>,
  echo: Echo,
  sieve: { mod: number; keep: Array<number> } | null,
): Plan {
  return withPlan(HOUSE, {
    name: rules.map(r => r.name).join('+') || 'bare',
    note: rules.map(r => r.says).join('; '),
    bar: rules.map(r => r.bar),
    echo,
    sieve: sieve ? { ...sieve, rank: SOUND_RANK_MAP } : null,
  })
}

/** Every subset of the catalogue up to `most` rules, smallest first. */
function subsets(list: Array<Rule>, most: number): Array<Array<Rule>> {
  const out: Array<Array<Rule>> = []
  function walk(at: number, picked: Array<Rule>) {
    if (picked.length > 0) {
      out.push([...picked])
    }
    if (picked.length === most) {
      return
    }
    for (let i = at; i < list.length; i++) {
      picked.push(list[i])
      walk(i + 1, picked)
      picked.pop()
    }
  }
  walk(0, [])
  out.sort((a, b) => a.length - b.length)
  return out
}

const found: Array<Found> = []

const sieves: Array<{ mod: number; keep: Array<number> } | null> = [null]
for (let mod = 2; mod <= 8; mod++) {
  for (let keep = 1; keep < mod; keep++) {
    const which: Array<number> = []
    for (let i = 0; i < keep; i++) {
      which.push(i)
    }
    sieves.push({ mod, keep: which })
  }
}

outer: for (const rules of subsets(RULES, 3)) {
  for (const echo of ECHOES) {
    for (const sieve of sieves) {
      const plan = planOf(rules, echo, sieve)
      const made = run(plan)
      if (made.count.fullAll !== TARGET) {
        continue
      }
      const cover = coverage(plan, made.full, INVENTORY)
      if (!cover.whole || !cover.pools) {
        continue
      }
      found.push({
        rules,
        echo,
        mod: sieve?.mod ?? 1,
        keep: sieve?.keep ?? [0],
        plan,
        lean: made.count.leanAll,
      })
      if (found.length >= WANT * 4) {
        break outer
      }
    }
  }
}

/** Fewest moving parts first, then the most words surviving closeness. */
found.sort((a, b) => {
  const partsA = a.rules.length + (a.echo === 'none' ? 0 : 1) + (a.mod > 1 ? 1 : 0)
  const partsB = b.rules.length + (b.echo === 'none' ? 0 : 1) + (b.mod > 1 ? 1 : 0)
  if (partsA !== partsB) {
    return partsA - partsB
  }
  return b.lean - a.lean
})

console.log(
  `${found.length} ways to reach exactly ${TARGET} with the whole inventory kept`,
)
console.log('')

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const index: Array<string> = [
  'variant,cvc,cvcc,ccvc,all,lean,echo,sieve,rules',
]

console.log('| n | CVC | CVCC | CCVC | all | lean | what it says |')
console.log('| ---: | ---: | ---: | ---: | ---: | ---: | :--- |')

const chosen = found.slice(0, WANT)

for (let i = 0; i < chosen.length; i++) {
  const { rules, echo, mod, keep, plan } = chosen[i]
  const { full, count } = run(plan)
  const cover = coverage(plan, full, INVENTORY)

  if (count.fullAll !== TARGET || !cover.whole || !cover.pools) {
    throw new Error(`variant ${i + 1} failed its own check`)
  }

  const nn = String(i + 1).padStart(2, '0')
  const dir = resolve(OUT_DIR, nn)

  for (const shape of SHAPES) {
    const words = [...full[shape]].map(p => p.word).sort(compareWords)
    write(
      resolve(dir, `${shape.toLowerCase()}.csv`),
      ['word', ...words].join('\n') + '\n',
    )
  }

  const sieveSays = mod > 1 ? `${keep.join(' ')} of ${mod}` : 'none'

  write(
    resolve(dir, 'plan.csv'),
    [
      'setting,value',
      `echo,${echo}`,
      `sieve,${sieveSays}`,
      ...rules.map(r => `rule,"${r.says}"`),
      `open,${plan.open.join(' ')}`,
      `close,${plan.close.join(' ')}`,
      `onset,${plan.onset.join(' ')}`,
      `coda,${plan.coda.join(' ')}`,
    ].join('\n') + '\n',
  )

  const says = rules.map(r => r.says).join('; ')

  index.push(
    [
      nn,
      count.full.CVC,
      count.full.CVCC,
      count.full.CCVC,
      count.fullAll,
      count.leanAll,
      echo,
      `"${sieveSays}"`,
      `"${says}"`,
    ].join(','),
  )

  const extra = [
    echo !== 'none' ? `echo ${echo}` : '',
    mod > 1 ? `sieve ${sieveSays}` : '',
  ]
    .filter(Boolean)
    .join('; ')

  console.log(
    `| ${nn} | ${count.full.CVC} | ${count.full.CVCC} | ${count.full.CCVC} | ` +
      `${count.fullAll} | ${count.leanAll} | ${says}${extra ? '; ' + extra : ''} |`,
  )
}

if (chosen.length > 0) {
  write(resolve(OUT_DIR, 'index.csv'), index.join('\n') + '\n')
  console.log('')
  console.log(`wrote ${OUT_DIR}`)
  console.log('')
  console.log('Each keeps all 22 consonants, all 5 vowels, all 19 openings,')
  console.log('all 19 closings, all 19 onset clusters and all 34 coda')
  console.log('clusters, and every one of them reaches a word.')
} else {
  console.log('nothing found, widen the catalogue in rule.ts')
}
