/**
 * Rebuilds every v4 output, in the order they depend on each other.
 *
 * Change a rule in `sound.ts` and this is the one command that puts
 * `base/v4/` and all of `base/v4/4096/` back in step with it. Running
 * one generator and not the others is how a folder ends up holding word
 * lists built under rules that no longer exist.
 *
 * The order matters in two places. `calculate` writes `base/v4/` and
 * `check` reads it back, so `check` runs second and the whole thing
 * stops there if the language does not hold together. `rank` reads the
 * `index.csv` that `twelve` writes, so it follows it.
 *
 * Each step is its own process, because the generators read `argv` and
 * run on import, so `favorite` can be called three times with three
 * different targets.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:regen
 *   pnpm --dir deck/tune v4:regen --skip favorite
 */

import { execFileSync } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(here, '../../..')

const argv = process.argv.slice(2)
const skipAt = argv.indexOf('--skip')
const SKIP = skipAt >= 0 ? argv.slice(skipAt + 1) : []

type Step = {
  name: string
  script: string
  args: Array<string>
  says: string
}

const STEPS: Array<Step> = [
  {
    name: 'base',
    script: 'calculate.ts',
    args: [],
    says: 'base/v4',
  },
  {
    name: 'check',
    script: 'check.ts',
    args: [],
    says: 'reads base/v4 back and proves it',
  },
  {
    name: 'drop',
    script: 'twelve.ts',
    args: [],
    says: '4096/01-drop-clusters',
  },
  {
    name: 'rank',
    script: 'rank.ts',
    args: [],
    says: '4096/01-drop-clusters/beauty.csv',
  },
  {
    name: 'bar',
    script: 'whole.ts',
    args: [],
    says: '4096/02-bar-positions',
  },
  {
    name: 'number',
    script: 'pattern.ts',
    args: [],
    says: '4096/03-number-pattern',
  },
  {
    name: 'weight',
    script: 'weight.ts',
    args: [],
    says: '4096/04-sound-weight',
  },
  {
    name: 'blend',
    script: 'blend.ts',
    args: [],
    says: '4096/05-blend',
  },
  {
    name: 'ratio',
    script: 'ratio.ts',
    args: [],
    says: '4096/<nn>-<ratio>, the six splits',
  },
  {
    name: 'keep',
    script: 'keep.ts',
    args: [],
    says: '4096/02-4-7-5, the settled system, meanings kept',
  },
  {
    name: 'term',
    script: 'term.ts',
    args: [],
    says: 'term/base.csv, the lexicon with its meanings',
  },
  {
    name: 'favorite',
    script: 'favorite.ts',
    args: ['--cvc', '1024', '--cvcc', '1792', '--ccvc', '1280', '--name', '06-favorite'],
    says: '4096/06-favorite, 4:7:5',
  },
  {
    name: 'favorite',
    script: 'favorite.ts',
    args: ['--cvc', '1024', '--cvcc', '1792', '--ccvc', '1280', '--name', '07-cvc-1024'],
    says: '4096/07-cvc-1024',
  },
  {
    name: 'favorite',
    script: 'favorite.ts',
    args: ['--cvc', '1024', '--cvcc', '2048', '--ccvc', '1024', '--name', '08-powers-of-two'],
    says: '4096/08-powers-of-two, 1:2:1',
  },
]

const started = Date.now()
let ran = 0
let skipped = 0

for (const step of STEPS) {
  if (SKIP.includes(step.name)) {
    console.log(`skipping ${step.name}, ${step.says}`)
    skipped++
    continue
  }

  const at = Date.now()
  process.stdout.write(`${step.name}: ${step.says} ... `)

  try {
    execFileSync(
      'node',
      [
        '--import',
        'tsx',
        resolve(here, step.script),
        ...step.args,
      ],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    )
  } catch (error) {
    console.log('FAILED')
    console.log('')
    const shown = error as { stdout?: Buffer; stderr?: Buffer }
    console.error(shown.stdout?.toString() ?? '')
    console.error(shown.stderr?.toString() ?? '')
    console.error(
      `\n${step.name} failed, so nothing after it ran. ` +
        `Fix that and run again.`,
    )
    process.exit(1)
  }

  console.log(`${((Date.now() - at) / 1000).toFixed(1)}s`)
  ran++
}

console.log('')
console.log(
  `${ran} rebuilt${skipped > 0 ? `, ${skipped} skipped` : ''}, ` +
    `in ${((Date.now() - started) / 1000).toFixed(1)}s`,
)
