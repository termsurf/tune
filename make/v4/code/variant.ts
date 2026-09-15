/**
 * Plugs variant plans into the engine and prints what they come to.
 *
 * A variant is the house plan with a field changed. Nothing here builds
 * words, because `plan.ts` does that for every plan alike.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/variant.ts
 */

import { run, withPlan, type Plan } from './plan'
import { HOUSE, MARKED_ONSETS, MARKED_SOUNDS, opensOnLiquid } from './house'

export const VARIANTS: Array<Plan> = [
  HOUSE,
  withPlan(HOUSE, {
    name: 'lenient',
    note: 'closeness on the same vowel only, so far fewer words are pruned',
    near: { ...HOUSE.near, reach: 0 },
  }),
  withPlan(HOUSE, {
    name: 'strict',
    note: 'closeness reaches two vowel notches and forgives one consonant',
    near: { ...HOUSE.near, reach: 2, slack: 1 },
  }),
  withPlan(HOUSE, {
    name: 'plain',
    note: 'no hush or interdental anywhere, so x j c C leave the language',
    open: HOUSE.open.filter(c => !MARKED_SOUNDS.includes(c)),
    close: HOUSE.close.filter(c => !MARKED_SOUNDS.includes(c)),
    coda: HOUSE.coda.filter(c => ![...c].some(s => MARKED_SOUNDS.includes(s))),
  }),
  withPlan(HOUSE, {
    name: 'twelve_bit',
    note: 'exactly 4,096 words, so a base word is twelve bits',
    open: HOUSE.open.filter(c => !MARKED_SOUNDS.includes(c)),
    onset: HOUSE.onset.filter(c => !MARKED_ONSETS.includes(c)),
    coda: HOUSE.coda.filter(
      c => opensOnLiquid(c) || ['mp', 'nt', 'nd', 'qk', 'ft'].includes(c),
    ),
  }),
]

function sizes(plan: Plan): string {
  return (
    `open ${plan.open.length}, close ${plan.close.length}, ` +
    `onset ${plan.onset.length}, coda ${plan.coda.length}`
  )
}

console.log('| variant | CVC | CVCC | CCVC | full | lean |')
console.log('| :--- | ---: | ---: | ---: | ---: | ---: |')
for (const plan of VARIANTS) {
  const { count } = run(plan)
  console.log(
    `| ${plan.name} | ${count.full.CVC.toLocaleString()} | ` +
      `${count.full.CVCC.toLocaleString()} | ` +
      `${count.full.CCVC.toLocaleString()} | ` +
      `**${count.fullAll.toLocaleString()}** | ` +
      `${count.leanAll.toLocaleString()} |`,
  )
}

console.log('')
for (const plan of VARIANTS) {
  console.log(`${plan.name}: ${plan.note}`)
  console.log(`  ${sizes(plan)}`)
}
