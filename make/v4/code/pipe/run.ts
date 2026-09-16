/**
 * The pipeline's one command. `v4:pipe --help` lists everything.
 *
 * **Reports by default and writes only on `--commit`.** Nothing here
 * edits `base.csv`, which is generated. A search writes CLAIMS, and a
 * claim only becomes the lexicon when it is made live and rendered.
 * That is the rule from `note/tune/pipeline/rules.md`: a model never
 * silently turns its own idea into one of your decisions.
 *
 * ## The division of labour
 *
 * **The machine does not choose how a word sounds.** `echoScore`
 * measures articulatory feature distance, which is not recognizability:
 * it rates `deq` against `ten` at 0.88 because `d` and `t` differ only
 * in voicing and `q` and `n` only in place. Nobody hearing `deq`
 * recovers `ten`. The measure is good at FINDING echoes that already
 * exist and bad at MAKING them, so it reports and does not place.
 *
 * What the machine settles is everything mechanical: legal, free, in the
 * chosen system, not taboo, not crowded, the right shape for the
 * concept's weight, and not contradicting `sound.md`.
 *
 * ```text
 * short   hands over ten candidates per concept, all already correct
 *         on every mechanical count, spread across ten different sounds
 * take    reads the choices back, authored by you, live
 * ```
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { Board, TERM, readBoard, takenAt } from './board'
import { breed, readGenome } from './breed'
import { readPool } from './pool'
import { buildTables, cardsOf, deltaOf, makeBench, refresh } from './score'
import { echoScore } from './echo'
import { speaks, vibeLoss } from './vibe'
import { DEFAULT_PLAN, anneal, greedy, stream } from './search'
import { report as mirrorReport } from './mirror'
import { fitReport, report as claimReport } from './claim'
import { report as clusterReport } from './cluster'
import { OPENNESS, traceOf } from './enact'
import {
  addClaim,
  readChoices,
  readClaims,
  render,
  seedFrom,
  storyOf,
  writeChoices,
} from './vary'

const args = yargs(hideBin(process.argv))
  .scriptName('v4:pipe')
  .usage('$0 <what> [options]')
  .command('rank', 'score the lexicon as it stands, sorted by suspicion')
  .command('mirror', 'the eight mirror quartets')
  .command('base', 'the three baselines, which is the control')
  .command('ceiling', 'what echo is reachable, and what blocks it')
  .command('claim', 'test each sound.md reading against the lexicon')
  .command('fit', 'fit the readings on half, measure on the other half')
  .command('forms', 'every free form matching a stated shape. A filter')
  .command('cluster', 'does word shape predict meaning in base.csv')
  .command('short', 'a shortlist of forms per concept, for a person to pick')
  .command('take', 'read the choices back out of a filled-in shortlist')
  .command('evolve', 'search for placements, one state, annealing')
  .command('breed', 'a population, with semantic crossover and memory')
  .command('retire', 'mark ai claims dropped so they stop being offered')
  .command('seed', 'seed the variant store from base.csv')
  .command('story <meaning..>', 'every variant ever proposed for one meaning')
  .command('pool', 'the concepts still wanting a word')
  .option('commit', {
    type: 'boolean',
    default: false,
    describe: 'actually write. Everything reports by default',
  })
  .option('shape', {
    type: 'string',
    describe: 'restrict to one word shape, e.g. CVC',
  })
  .option('from', {
    type: 'string',
    describe: 'restrict the concept pool to one source, e.g. words',
  })
  .option('loose', {
    type: 'boolean',
    default: false,
    describe: 'let the search touch tier 1, the words assigned by hand',
  })
  .option('seed', {
    type: 'number',
    describe: 'the search seed. Recorded, so any run replays exactly',
  })
  .option('steps', { type: 'number', describe: 'annealing steps' })
  .option('heat', { type: 'number', describe: 'starting temperature' })
  .option('vowel', {
    type: 'string',
    describe: 'forms: keep only these vowels, e.g. iu',
  })
  .option('onset', {
    type: 'string',
    choices: ['stop', 'nasal', 'air', 'glide'],
    describe: 'forms: what the word opens on',
  })
  .option('coda', {
    type: 'string',
    choices: ['stop', 'nasal', 'air', 'glide'],
    describe: 'forms: what the word closes on',
  })
  .option('opens', {
    type: 'boolean',
    default: false,
    describe: 'forms: only words that open out, stop to air',
  })
  .option('shuts', {
    type: 'boolean',
    default: false,
    describe: 'forms: only words that shut, air to stop',
  })
  .option('anyway', {
    type: 'boolean',
    default: false,
    describe:
      'run a search even when the control says the objective is blind',
  })
  .option('settle', {
    type: 'number',
    default: 6000,
    describe:
      'breed: annealing steps each member gets to reach its own optimum',
  })
  .option('many', {
    type: 'number',
    default: 12,
    describe: 'how many candidates per concept in a shortlist',
  })
  .option('why', {
    type: 'string',
    default: 'anneal',
    describe: 'retire: match claims whose reason contains this',
  })
  .strict()
  .help()
  .parseSync()

const WHAT = String(args._[0] ?? 'rank')
const COMMIT = args.commit

function out(text: string): void {
  process.stdout.write(`${text}\n`)
}

// ─── Shared setup ───────────────────────────────────────

function bench() {
  const board = readBoard()
  const tables = buildTables(board.forms)
  return { board, tables, bench: makeBench(board, tables) }
}

// ─── rank ───────────────────────────────────────────────

/**
 * Scores the lexicon as it stands and sorts ascending.
 *
 * `score.md` calls this the single most useful artefact in the whole
 * design, and it needs no search and no model: a ranked list of the
 * words most likely to be wrong.
 */
function doRank(): void {
  const { bench: b } = bench()
  const cards = cardsOf(b)

  out(`lexicon loss ${b.total.toFixed(2)} over ${cards.length} words`)
  out('')
  out('  WRONG WORD: no echo available and none taken. Sorted by own loss.')
  out('')
  out('  word   own    echo  meaning')
  for (const card of [...cards].sort((x, y) => y.own - x.own).slice(0, 15)) {
    out(
      `  ${card.word.padEnd(6)} ${card.own.toFixed(2).padStart(6)} ` +
        `${card.echo.toFixed(2).padStart(5)}  ${card.meaning}`,
    )
  }

  out('')
  out('  CROWDED: sitting closer to its neighbours than its form forces.')
  out('')
  out('  word   crowd  near  meaning')
  for (const card of [...cards]
    .sort((x, y) => y.crowd - x.crowd)
    .slice(0, 15)) {
    out(
      `  ${card.word.padEnd(6)} ${card.crowd.toFixed(2).padStart(6)} ` +
        `${String(Math.round(card.pair / Math.max(card.crowd, 1e-9))).padStart(5)}  ${card.meaning}`,
    )
  }

  out('')
  out('  STRONGEST ECHOES, which is what good looks like')
  out('')
  for (const card of [...cards]
    .sort((x, y) => y.echo - x.echo || x.own - y.own)
    .slice(0, 12)) {
    out(
      `  ${card.word.padEnd(6)} ${card.echo.toFixed(2).padStart(6)}        ${card.meaning}`,
    )
  }

  const rows = ['word,meaning,tier,shape,echo,own,pair,crowd,loss']
  for (const card of cards) {
    rows.push(
      [
        card.word,
        /[",]/.test(card.meaning) ? `"${card.meaning.replace(/"/g, '""')}"` : card.meaning,
        card.tier,
        card.shape,
        card.echo.toFixed(4),
        card.own.toFixed(4),
        card.pair.toFixed(4),
        card.crowd.toFixed(4),
        card.loss.toFixed(4),
      ].join(','),
    )
  }
  writeFileSync(resolve(TERM, 'rank.csv'), `${rows.join('\n')}\n`)
  out('')
  out(`wrote ${resolve(TERM, 'rank.csv')}`)
}

// ─── base ───────────────────────────────────────────────

/** The one number that actually separates a chosen lexicon from a shuffled one. */
function meanEcho(cards: Array<{ echo: number }>): number {
  if (cards.length === 0) return 0
  let sum = 0
  for (const card of cards) {
    sum += card.echo
  }
  return sum / cards.length
}

/**
 * Mean vibe disagreement over the concepts that SAY something.
 *
 * Averaging over all words would bury the signal under the majority that
 * score 0 for having no opinion, and 0 there means "no evidence" rather
 * than "agrees perfectly".
 */
function meanVibe(cards: Array<{ vibe: number; speaks: boolean }>): number {
  const loud = cards.filter(c => c.speaks)
  if (loud.length === 0) return 0
  return loud.reduce((sum, c) => sum + c.vibe, 0) / loud.length
}

/**
 * The three baselines.
 *
 * `engine.md`: a search reporting improvement is reporting a number its
 * own objective produced, which is circular. The result that matters is
 * not that the search beats random, because any working search does. It
 * is whether it beats the words chosen by hand.
 *
 * **Until it does, the hand-made words are the state of the art.**
 */
function doBase(): void {
  const { board, tables } = bench()
  const b = makeBench(board, tables)
  const current = refresh(b)
  const currentCards = cardsOf(b)
  const currentEcho = meanEcho(currentCards)
  const currentVibe = meanVibe(currentCards)
  const speaking = currentCards.filter(c => c.speaks).length

  const at = takenAt(board)
  const meanings = at.map(i => board.meaning[i])

  // A deterministic shuffle of the same meanings over the same forms.
  const next = stream(DEFAULT_PLAN.seed)
  const order = [...meanings]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const swap = order[i]
    order[i] = order[j]
    order[j] = swap
  }
  for (let k = 0; k < at.length; k++) {
    board.meaning[at[k]] = order[k]
  }
  board.at.clear()
  for (let i = 0; i < board.meaning.length; i++) {
    if (board.meaning[i]) board.at.set(board.meaning[i], i)
  }
  const scrambled = refresh(b)
  const shuffledCards = cardsOf(b)
  const shuffledEcho = meanEcho(shuffledCards)
  const shuffledVibe = meanVibe(shuffledCards)

  out('  baseline            loss      echo    vibe off')
  out(
    `  random              ${scrambled.toFixed(2).padStart(9)}  ${shuffledEcho.toFixed(3)}   ${shuffledVibe.toFixed(3)}    the same meanings, shuffled`,
  )
  out(
    `  current             ${current.toFixed(2).padStart(9)}  ${currentEcho.toFixed(3)}   ${currentVibe.toFixed(3)}    base.csv, chosen by hand`,
  )
  out('')
  out(`  ${speaking} of ${currentCards.length} concepts say enough for the vibe term to read.`)
  out('')

  // The loss is negative once coverage is counted, so a ratio flips
  // sign and lies. Report the gap, which is sound either way.
  const gap = scrambled - current
  const echoLift = ((currentEcho - shuffledEcho) / Math.max(shuffledEcho, 1e-9)) * 100

  out(
    `  gap                    ${gap.toFixed(2)}  ${gap > 0 ? 'in favour of the hand-made words' : 'AGAINST the hand-made words'}`,
  )
  out(`  on ECHO alone          ${echoLift.toFixed(0)}% better than chance`)
  const vibeLift = shuffledVibe - currentVibe
  out(
    `  on VIBE alone          ${vibeLift > 0 ? '' : '+'}${(-vibeLift).toFixed(3)} disagreement ` +
      `${vibeLift > 0 ? 'LESS' : 'MORE'} than chance`,
  )
  if (vibeLift <= 0.005) {
    out('')
    out('  The vibe term does NOT separate the hand-made words from a shuffle.')
    out('  Either the sound readings, the concept cues, or the claim itself is')
    out('  wrong, and it should not be trusted to place anything until it does.')
  }
  out('')
  out('  Read the second number, not the first, and here is why.')
  out('')
  out('  The pair terms depend on WHICH FORMS are occupied, and a shuffle')
  out('  occupies exactly the same forms. So they are very nearly constant')
  out('  under any swap, they dominate the total, and they drown the signal.')
  out('')
  out('  That is a real property of the objective and not a bug: crowding is')
  out('  what PLACING a new word must answer to, and echo is what SWAPPING')
  out('  must answer to. Reporting them together hides both.')
}

// ─── evolve ─────────────────────────────────────────────

function doEvolve(): void {
  // Placing into empty forms is still meaningful when the objective
  // cannot rank assignments, because `cover` and `spread` genuinely
  // answer "is this form a good home". Swapping assigned words is not,
  // so only the loose form is guarded.
  if (args.loose && !args.anyway && refuseIfBlind('evolve --loose')) {
    return
  }
  const { board, tables, bench: b } = bench()
  const taken = new Set(board.meaning.filter(Boolean))

  const SHAPE = args.shape ?? ''
  const LOOSE = args.loose

  /**
   * What the search may touch.
   *
   * Tier 0 is never open. Tier 1 is open only under `--loose`, because
   * the standing instruction is that the assigned words stay for now and
   * a proposal has to be argued rather than stumbled into.
   */
  const open = new Set<number>()
  for (let i = 0; i < board.forms.length; i++) {
    if (board.tier[i] === 0) continue
    if (!LOOSE && board.tier[i] < 4) continue
    if (SHAPE && tables.shape[i] !== SHAPE) continue
    open.add(i)
  }

  const FROM = args.from ?? ''

  const pool = readPool(taken)
    .filter(w => !SHAPE || SHAPE !== 'CVC' || w.short)
    .filter(w => !FROM || w.from.startsWith(FROM))

  const plan = {
    ...DEFAULT_PLAN,
    seed: args.seed ?? DEFAULT_PLAN.seed,
    steps: args.steps ?? DEFAULT_PLAN.steps,
    heat: args.heat ?? DEFAULT_PLAN.heat,
  }

  out(`  ${taken.size} meanings placed, ${pool.length} waiting`)
  out(
    `  ${open.size} positions open${SHAPE ? ` (${SHAPE} only)` : ''}` +
      `${LOOSE ? ', tier 1 unlocked' : ', tier 0 and 1 held'}`,
  )
  out(`  seed ${plan.seed}, ${plan.steps.toLocaleString()} steps, heat ${plan.heat}`)
  out('')

  const before = new Map<number, string>()
  for (let i = 0; i < board.meaning.length; i++) {
    before.set(i, board.meaning[i])
  }

  // Enumerate and rank first, then polish. See `greedy`.
  const seeded = greedy(b, pool.map(w => w.meaning), open)
  out(
    `  greedy placed ${seeded.placed}, left ${seeded.skipped} unsaid (no form improved the whole)`,
  )

  const stillWaiting = pool
    .map(w => w.meaning)
    .filter(m => !board.at.has(m))

  const result = anneal(b, { waiting: stillWaiting, open }, plan)

  out(`  loss ${result.before.toFixed(2)} -> ${result.after.toFixed(2)}`)
  out(
    `  ${result.kept.toLocaleString()} of ${result.tried.toLocaleString()} moves kept, ` +
      `${result.placed} placed, ${result.moved} swapped`,
  )
  out('')

  const fresh: Array<{ word: string; meaning: string }> = []
  for (let i = 0; i < board.meaning.length; i++) {
    if (board.meaning[i] && board.meaning[i] !== before.get(i)) {
      fresh.push({ word: board.forms[i], meaning: board.meaning[i] })
    }
  }

  const scored = fresh
    .map(row => ({
      ...row,
      echo: echoScore(row.word, row.meaning),
      vibe: vibeLoss(row.word, row.meaning),
      speaks: speaks(row.meaning),
    }))
    .sort((a, b) => b.echo - a.echo)
  const meanNew =
    scored.reduce((sum, r) => sum + r.echo, 0) / Math.max(1, scored.length)
  const loud = scored.filter(r => r.speaks)
  const meanVibeNew =
    loud.length > 0
      ? loud.reduce((sum, r) => sum + r.vibe, 0) / loud.length
      : 0

  out(`  ${fresh.length} bindings differ from where they started`)
  out(`  mean echo ${meanNew.toFixed(3)}, against 0.577 for the hand-made`)
  out(
    `  mean vibe disagreement ${meanVibeNew.toFixed(3)} over ${loud.length} that speak, against 0.443`,
  )
  out('')
  out('  BEST of what it found')
  out('')
  for (const row of scored.slice(0, 25)) {
    out(`  ${row.word.padEnd(6)} ${row.echo.toFixed(2)}  ${row.meaning}`)
  }
  out('')
  out('  WORST of what it found, which is where the pool has no echo to give')
  out('')
  for (const row of scored.slice(-10)) {
    out(`  ${row.word.padEnd(6)} ${row.echo.toFixed(2)}  ${row.meaning}`)
  }

  if (!COMMIT) {
    out('')
    out('  reported only. Re-run with --commit to record these as claims.')
    return
  }

  const choices = readChoices()
  let added = 0
  for (const row of fresh) {
    const id = addClaim({
      word: row.word,
      meaning: row.meaning,
      author: 'ai',
      why: `anneal seed ${plan.seed} steps ${plan.steps}`,
    })
    if (!choices.has(id)) {
      // Proposed, NOT live. A person makes it live.
      choices.set(id, 'shelved')
      added++
    }
  }
  writeChoices(choices)
  out('')
  out(`  recorded ${added} claims as shelved, authored by ai.`)
  out('  None are live. Review them, then flip the ones you want.')
}

// ─── ceiling ────────────────────────────────────────────

/**
 * What echo is even reachable, and what is standing in the way.
 *
 * A mean echo below the hand-made words has two possible causes and
 * they call for opposite responses:
 *
 *   the POOL   these concepts have no English shape Tune can hold
 *   the BOARD  the forms that would echo them are already taken
 *
 * Only the second is fixable by searching harder, so measuring which it
 * is comes before deciding anything. This compares the best free form
 * against the best form of any kind.
 */
function doCeiling(): void {
  const { board, tables } = bench()
  const taken = new Set(board.meaning.filter(Boolean))

  const FROM = args.from ?? 'words'
  const pool = readPool(taken)
    .filter(w => w.short)
    .filter(w => !FROM || w.from.startsWith(FROM))

  const cvc: Array<number> = []
  for (let i = 0; i < board.forms.length; i++) {
    if (tables.shape[i] === 'CVC') cvc.push(i)
  }

  let freeStrong = 0
  let anyStrong = 0
  const blocked: Array<{ meaning: string; want: string; held: string; echo: number }> = []

  for (const want of pool) {
    let bestFree = 0
    let bestAny = 0
    let bestAnyAt = -1
    for (const at of cvc) {
      const echo = echoScore(board.forms[at], want.meaning)
      if (echo > bestAny) {
        bestAny = echo
        bestAnyAt = at
      }
      if (!board.meaning[at] && board.tier[at] >= 4 && echo > bestFree) {
        bestFree = echo
      }
    }
    if (bestFree >= 0.72) freeStrong++
    if (bestAny >= 0.72) anyStrong++
    if (bestAny - bestFree > 0.25 && bestAnyAt >= 0) {
      blocked.push({
        meaning: want.meaning,
        want: board.forms[bestAnyAt],
        held: board.meaning[bestAnyAt] || '(free, wrong shape)',
        echo: bestAny,
      })
    }
  }

  out(`  ${pool.length} concepts waiting, over ${cvc.length} CVC forms`)
  out('')
  out(`  could reach a strong echo using ANY form    ${anyStrong}`)
  out(`  can reach one using a FREE form             ${freeStrong}`)
  out('')
  out(
    `  So ${anyStrong - freeStrong} concepts are blocked by a form that is already taken,`,
  )
  out(
    `  and ${pool.length - anyStrong} have no strong echo anywhere in the CVC inventory at all.`,
  )
  out('')
  out('  BLOCKED, worst first. The held word would have to move.')
  out('')
  out('  want   echo  concept                    currently means')
  for (const row of blocked.sort((a, b) => b.echo - a.echo).slice(0, 25)) {
    out(
      `  ${row.want.padEnd(6)} ${row.echo.toFixed(2)}  ${row.meaning.slice(0, 25).padEnd(26)} ${row.held}`,
    )
  }
}

// ─── short ──────────────────────────────────────────────

/**
 * A shortlist of forms per concept, for a person to choose the sound.
 *
 * **The echo constraint is not the machine's to solve.** `echoScore`
 * measures feature distance rather than recognizability, so it accepts
 * `deq` for `ten`, and no amount of weighting fixes a measure that is
 * wrong about what it is measuring.
 *
 * What the machine CAN settle is everything mechanical: the form is
 * legal, free, in the chosen system, not taboo, not crowded against its
 * neighbours, the right shape for the concept's importance, and its
 * sounds do not contradict its sense. That leaves a short list where
 * every option is already correct on all of it.
 *
 * Then a person picks the one that sounds right, which is the part that
 * needs an ear.
 */
/**
 * Every free form matching a stated shape. A filter, not a ranker.
 *
 * `v4:pipe forms --coda nasal --opens --vowel u`
 *
 * **This replaces ranking with enumeration on purpose.** Three separate
 * attempts to score which form suits which meaning have now failed their
 * controls, and `v4:pipe cluster` says why: words sharing a sound in
 * this lexicon mean related things only 2% more often than chance at the
 * opening, and not at all at the closing or the vowel. The shape of a
 * word does not predict its meaning here, so a ranking over forms is a
 * ranking over noise.
 *
 * What the machine does know exactly: which forms are legal, which are
 * free, what each one is made of, and whether it satisfies a rule that
 * was actually stated. So it filters and hands the list over.
 */
function doForms(): void {
  const { board, tables } = bench()

  const SHAPE = args.shape ?? 'CVC'
  const free: Array<string> = []
  for (let i = 0; i < board.forms.length; i++) {
    if (board.meaning[i]) continue
    if (board.tier[i] < 4) continue
    if (SHAPE && tables.shape[i] !== SHAPE) continue
    free.push(board.forms[i])
  }

  const wantVowel = args.vowel ?? ''
  const wantCoda = args.coda ?? ''
  const wantOnset = args.onset ?? ''

  const classOf = (sound: string): string => {
    const open = OPENNESS[sound]
    if (open === undefined) return ''
    return open === 0
      ? 'stop'
      : open === 1
        ? 'nasal'
        : open === 2
          ? 'air'
          : 'glide'
  }

  const matching = free.filter(word => {
    const at = word.split('').findIndex(s => 'ieaou'.includes(s))
    const vowel = word[at]
    const onset = word.slice(0, Math.max(1, at))
    const coda = word.slice(at + 1)
    if (wantVowel && !wantVowel.split('').includes(vowel)) return false
    if (wantOnset && classOf(onset[onset.length - 1]) !== wantOnset) {
      return false
    }
    if (wantCoda && classOf(coda[0]) !== wantCoda) return false
    if (args.opens && traceOf(word) < 0.3) return false
    if (args.shuts && traceOf(word) > -0.3) return false
    return true
  })

  out(`  ${matching.length} free ${SHAPE} forms match`)
  const said = [
    wantOnset && `opening on a ${wantOnset}`,
    wantVowel && `vowel in ${wantVowel}`,
    wantCoda && `closing on a ${wantCoda}`,
    args.opens && 'opening out, stop to air',
    args.shuts && 'shutting, air to stop',
  ].filter(Boolean)
  if (said.length) {
    out(`  ${said.join(', ')}`)
  }
  out('')

  // Grouped by ending, so the list is scannable rather than a wall.
  const byCoda = new Map<string, Array<string>>()
  for (const word of matching) {
    const at = word.split('').findIndex(s => 'ieaou'.includes(s))
    const coda = word.slice(at + 1)
    const list = byCoda.get(coda) ?? []
    list.push(word)
    byCoda.set(coda, list)
  }
  for (const [coda, list] of [...byCoda.entries()].sort()) {
    out(`  -${coda.padEnd(3)} ${list.join(' ')}`)
  }
}

function doShort(): void {
  const { board, tables, bench: b } = bench()
  const taken = new Set(board.meaning.filter(Boolean))

  const SHAPE = args.shape ?? 'CVC'
  const FROM = args.from ?? 'words'
  const HOW_MANY = args.many

  const open: Array<number> = []
  for (let i = 0; i < board.forms.length; i++) {
    if (board.meaning[i]) continue
    if (board.tier[i] < 4) continue
    if (SHAPE && tables.shape[i] !== SHAPE) continue
    open.push(i)
  }

  const pool = readPool(taken)
    .filter(w => SHAPE !== 'CVC' || w.short)
    .filter(w => !FROM || w.from.startsWith(FROM))

  out(`  ${pool.length} concepts, ${open.length} free ${SHAPE} forms`)
  out(`  ${HOW_MANY} candidates each, ranked on everything except echo`)
  out('')
  out('  Every option below is already legal, free, uncrowded and')
  out('  consistent with sound.md. Pick the one that SOUNDS right.')
  out('')

  const rows = ['meaning,choice,candidates']
  for (const want of pool) {
    const scored = open
      .map(at => ({
        at,
        word: board.forms[at],
        delta: deltaOf(b, { kind: 'place', at, meaning: want.meaning }),
      }))
      .sort((x, y) => x.delta - y.delta)

    /**
     * Spread the shortlist across DIFFERENT OPENING SOUNDS.
     *
     * Taking the top ten by score gives every concept the same list.
     * With echo out of the scoring, what is left barely distinguishes
     * one free form from another, so the ranking collapses onto whatever
     * corner of the inventory is least crowded and hands back
     * `geq geg gek yeq keq` for everything.
     *
     * A shortlist whose options all sound alike is not a choice. So one
     * per onset, best first, which gives ten genuinely different sounds
     * to choose between and is the only thing that makes this list worth
     * reading.
     */
    const seenOnset = new Set<string>()
    const seenRhyme = new Set<string>()
    const ranked: typeof scored = []
    // Distinct opening AND distinct ending, so ten options are ten
    // different sounds rather than ten spellings of the same one.
    for (const pass of [0, 1]) {
      for (const option of scored) {
        if (ranked.length >= HOW_MANY) break
        if (ranked.includes(option)) continue
        const onset = option.word[0]
        const rhyme = option.word.slice(1)
        if (pass === 0 && (seenOnset.has(onset) || seenRhyme.has(rhyme))) {
          continue
        }
        if (pass === 1 && seenOnset.has(onset)) continue
        seenOnset.add(onset)
        seenRhyme.add(rhyme)
        ranked.push(option)
      }
    }

    out(`  ${want.meaning.padEnd(16)} ${ranked.map(r => r.word).join(' ')}`)
    rows.push(
      `${/[",]/.test(want.meaning) ? `"${want.meaning.replace(/"/g, '""')}"` : want.meaning},,${ranked.map(r => r.word).join(' ')}`,
    )
  }

  const file = resolve(TERM, 'scratchpad', `short-${SHAPE.toLowerCase()}.csv`)
  writeFileSync(file, `${rows.join('\n')}\n`)
  out('')
  out(`  wrote ${file}`)
  out('  Fill the `choice` column, then v4:pipe take --from short-cvc')
}

// ─── The guard ──────────────────────────────────────────

/**
 * Refuses to search when the objective cannot tell a chosen lexicon
 * from a shuffle of itself.
 *
 * **This check exists because a search passed without it.** With `echo`
 * switched off for placing, the gap between `base.csv` and a shuffle of
 * its own meanings fell from 9,350 to 245. At that point almost nothing
 * in the score depends on WHICH meaning sits on which form: `cover` is
 * constant, and `spread` and `drift` care about which forms are
 * occupied rather than by what.
 *
 * `breed` then did exactly what it was asked to. It improved the loss
 * from -74,978 to -76,566 by moving 1,642 words, turning `mam` mother
 * into 10^5 and `mit` meet into pleasure. **The search was correct and
 * the objective was blind**, which is the failure mode that looks most
 * like success.
 *
 * So the control runs first, and a thin gap stops the run.
 */
function objectiveIsBlind(): { blind: boolean; gap: number } {
  const { board, tables } = bench()
  const b = makeBench(board, tables)
  const current = refresh(b)

  const at = takenAt(board)
  const meanings = at.map(i => board.meaning[i])
  const next = stream(DEFAULT_PLAN.seed)
  const order = [...meanings]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const swap = order[i]
    order[i] = order[j]
    order[j] = swap
  }
  for (let k = 0; k < at.length; k++) {
    board.meaning[at[k]] = order[k]
  }
  board.at.clear()
  for (let i = 0; i < board.meaning.length; i++) {
    if (board.meaning[i]) board.at.set(board.meaning[i], i)
  }
  const scrambled = refresh(b)

  const gap = scrambled - current
  /**
   * One percent of the total, and the first threshold here was a tenth
   * of that, which let a blind search straight through.
   *
   * The number to calibrate against: with `echo` counted, this gap is
   * 9,350. Without it, 245. So the score had lost 97% of its power to
   * tell a chosen lexicon from a shuffled one, and a guard that passed
   * that is not a guard.
   */
  return { blind: gap < Math.abs(current) * 0.01, gap }
}

function refuseIfBlind(what: string): boolean {
  const { blind, gap } = objectiveIsBlind()
  if (!blind) {
    return false
  }
  out('  REFUSING TO RUN.')
  out('')
  out(
    `  The objective separates base.csv from a shuffle of itself by only ${gap.toFixed(0)}.`,
  )
  out('  At that margin it barely depends on which meaning sits on which')
  out('  form, so anything `' + what + '` finds is numerical noise dressed')
  out('  up as a result. It would move hundreds of words and report an')
  out('  improvement, which is worse than doing nothing.')
  out('')
  out('  `echo` is off because it measures feature distance rather than')
  out('  recognizability. `vibe` is off because the order-aware rewrite')
  out('  scores worse than chance. Until one of them is fixed, the score')
  out('  cannot rank assignments and no search over them is meaningful.')
  out('')
  out('  `v4:pipe base` shows the numbers. `--anyway` overrides this.')
  return true
}

// ─── breed ──────────────────────────────────────────────

/**
 * The semantic regions crossover swaps whole.
 *
 * A region has to be a set of concepts that belong together, or
 * crossover is just a scattered mutation with extra steps. The sources
 * already group them: every system in `scratchpad/`, and each of the
 * concept lists.
 */
function regionsOf(board: Board): Array<{ name: string; members: Set<string> }> {
  const out: Array<{ name: string; members: Set<string> }> = []
  const dir = resolve(TERM, 'scratchpad')

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.csv')) continue
    const rows: Array<Record<string, string>> = parse(
      readFileSync(resolve(dir, file), 'utf-8'),
      { columns: true, skip_empty_lines: true, relax_column_count: true },
    )
    const members = new Set<string>()
    for (const row of rows) {
      const says = (row.meaning ?? '').trim()
      if (says) members.add(says)
    }
    if (members.size > 1) {
      out.push({ name: file.replace('.csv', ''), members })
    }
  }

  for (const name of ['must', 'kind', 'build', 'root', 'list']) {
    const file = resolve(TERM, `${name}.csv`)
    if (!existsSync(file)) continue
    const rows: Array<Record<string, string>> = parse(
      readFileSync(file, 'utf-8'),
      { columns: true, skip_empty_lines: true, relax_column_count: true },
    )
    const members = new Set<string>()
    for (const row of rows) {
      const says = (row.meaning ?? row.name ?? row.term ?? '').trim()
      if (says && board.at.has(says)) members.add(says)
    }
    if (members.size > 1) {
      out.push({ name, members })
    }
  }

  return out
}

function doBreed(): void {
  if (!args.anyway && refuseIfBlind('breed')) {
    return
  }
  const { board, tables, bench: b } = bench()
  void tables

  const LOOSE = args.loose
  const open = new Set<number>()
  for (let i = 0; i < board.forms.length; i++) {
    if (board.tier[i] === 0) continue
    if (!LOOSE && board.tier[i] < 4) continue
    open.add(i)
  }

  const regions = regionsOf(board)
  const farm = {
    seed: args.seed ?? DEFAULT_PLAN.seed,
    size: args.many,
    generations: args.steps ?? 20,
    regions,
    open,
    settle: args.settle,
  }

  out(`  ${regions.length} regions crossover can swap whole:`)
  out(
    `    ${regions.map(r => `${r.name}(${r.members.size})`).join('  ')}`,
  )
  out('')
  out(
    `  population ${farm.size}, ${farm.generations} generations, seed ${farm.seed}`,
  )
  out(`  ${open.size} positions open${LOOSE ? ', tier 1 unlocked' : ''}`)
  out('')

  if (regions.length === 0) {
    out('  Nothing to recombine. Crossover needs regions.')
    return
  }

  const before = readGenome(board, 'base.csv')
  const got = breed(b, before, farm)

  out(`  loss ${got.start.toFixed(2)} -> ${got.end.toFixed(2)}`)
  out(`  ${got.crossed} crossovers, ${got.repaired} displaced words re-placed`)
  out(`  memory holds ${got.memory.size} rejected placements`)

  /**
   * The check that cannot be fooled by a threshold.
   *
   * If a run improves the loss by MORE than the whole distance between
   * the hand-made lexicon and a shuffle of itself, then it has found
   * more value than the score is able to see, which is impossible. It is
   * exploiting the part of the objective that does not depend on
   * meaning. Measured after the fact, against this run's own numbers.
   */
  const won = got.start - got.end
  const { gap } = objectiveIsBlind()
  if (won > gap * 0.5) {
    out('')
    out(`  THIS RESULT IS NOT TRUSTWORTHY.`)
    out('')
    out(`  It improved the loss by ${won.toFixed(0)}, and the entire distance`)
    out(`  between base.csv and a shuffle of its own meanings is ${gap.toFixed(0)}.`)
    out('  A run cannot honestly find more than the score can see. The')
    out('  gains are coming from terms that do not depend on which meaning')
    out('  sits where, so the words below are rearranged, not improved.')
  }
  out('')
  out(`  best at each generation: ${got.curve.map(n => n.toFixed(0)).join(' ')}`)

  const moved: Array<{ word: string; was: string; now: string }> = []
  for (let i = 0; i < board.forms.length; i++) {
    if (got.best.meaning[i] !== before.meaning[i]) {
      moved.push({
        word: board.forms[i],
        was: before.meaning[i] || '(free)',
        now: got.best.meaning[i] || '(free)',
      })
    }
  }

  out('')
  out(`  ${moved.length} forms differ`)
  out('')
  for (const row of moved.slice(0, 25)) {
    out(`  ${row.word.padEnd(6)} ${row.was.slice(0, 22).padEnd(23)} -> ${row.now}`)
  }

  const restless = got.memory.restless(10)
  if (restless.length) {
    out('')
    out('  MOST RESTLESS, which is where the design is unsettled')
    out('')
    for (const row of restless) {
      out(`  ${String(row.tried).padStart(4)} forms tried and rejected  ${row.meaning}`)
    }
  }

  if (!COMMIT) {
    out('')
    out('  reported only. Re-run with --commit to record these as claims.')
  }
}

// ─── vary ───────────────────────────────────────────────

function doSeed(): void {
  const { board } = bench()
  const pairs: Array<{ word: string; meaning: string }> = []
  for (let i = 0; i < board.forms.length; i++) {
    if (board.meaning[i]) {
      pairs.push({ word: board.forms[i], meaning: board.meaning[i] })
    }
  }
  out(`  ${pairs.length} bindings in base.csv`)
  if (!COMMIT) {
    out('  reported only. Re-run with --commit to write them as live claims.')
    return
  }
  const added = seedFrom(pairs)
  out(`  wrote ${added} new claims, all live, authored by you.`)
  const shown = render()
  out(`  renders ${shown.word.size} bindings, ${shown.clash.length} clashes`)
  for (const clash of shown.clash) {
    out(`    ${clash}`)
  }
}

/**
 * Marks claims `dropped`, so they stop being offered.
 *
 * `dropped` and `shelved` are different on purpose. Shelved means tried
 * and set aside and may come back. **Dropped means decided against**,
 * and the 93 echo-driven placements are dropped rather than shelved
 * because the signal that produced them was wrong, not merely unlucky.
 * They stay in `claim.csv` forever, as the record of an approach that
 * was tried and did not work.
 */
function doRetire(): void {
  const WHY = args.why

  const claims = readClaims()
  const choices = readChoices()
  let hit = 0
  for (const claim of claims) {
    if (claim.author !== 'ai') continue
    if (!claim.why.includes(WHY)) continue
    if (choices.get(claim.id) === 'live') continue
    choices.set(claim.id, 'dropped')
    hit++
  }

  out(`  ${hit} ai claims matching "${WHY}" would be dropped`)
  if (!COMMIT) {
    out('  reported only. Re-run with --commit.')
    return
  }
  writeChoices(choices)
  out('  dropped. They stay in claim.csv as the record.')
}

/**
 * Takes a person's choices from a filled-in shortlist.
 *
 * The `choice` column is the author's, so the claim is authored `you`
 * and made `live`. That is the whole point of the split: the machine
 * narrows, a person decides, and the record says which was which.
 */
function doTake(): void {
  const FROM = args.from ?? 'short-cvc'
  const file = resolve(TERM, 'scratchpad', `${FROM}.csv`)

  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )

  const picked = rows
    .map(r => ({
      meaning: (r.meaning ?? '').trim(),
      word: (r.choice ?? '').trim(),
      offered: (r.candidates ?? '').trim().split(/\s+/),
    }))
    .filter(r => r.meaning && r.word)

  out(`  ${picked.length} of ${rows.length} rows have a choice`)
  out('')

  const strayed = picked.filter(p => !p.offered.includes(p.word))
  for (const p of strayed) {
    out(`  ${p.word} for "${p.meaning}" was not on the shortlist, which is fine`)
  }
  if (strayed.length) out('')

  for (const p of picked) {
    out(`  ${p.word.padEnd(6)} ${p.meaning}`)
  }

  if (!COMMIT) {
    out('')
    out('  reported only. Re-run with --commit to record them as yours, live.')
    return
  }

  const choices = readChoices()
  for (const p of picked) {
    const id = addClaim({
      word: p.word,
      meaning: p.meaning,
      author: 'you',
      why: `chosen from ${FROM}`,
    })
    choices.set(id, 'live')
  }
  writeChoices(choices)
  out('')
  out(`  recorded ${picked.length} claims, authored by you, live.`)
}

function doStory(): void {
  const meaning = ((args.meaning as Array<string>) ?? []).join(' ')
  if (!meaning) {
    out('  give a meaning, e.g. v4:pipe story experience')
    return
  }
  const story = storyOf(meaning)
  if (story.claims.length === 0) {
    out(`  nothing has ever been proposed for "${meaning}"`)
    return
  }
  out(`  "${meaning}"`)
  out('')
  out('  id           word   state     author  made        why')
  for (const c of story.claims) {
    out(
      `  ${c.id.padEnd(12)} ${c.word.padEnd(6)} ${c.state.padEnd(9)} ` +
        `${c.author.padEnd(7)} ${c.made.padEnd(11)} ${c.why}`,
    )
  }
}

// ─── Dispatch ───────────────────────────────────────────

switch (WHAT) {
  case 'rank':
    doRank()
    break
  case 'mirror':
    out(mirrorReport())
    break
  case 'base':
    doBase()
    break
  case 'evolve':
    doEvolve()
    break
  case 'ceiling':
    doCeiling()
    break
  case 'forms':
    doForms()
    break
  case 'cluster':
    out(clusterReport())
    break
  case 'short':
    doShort()
    break
  case 'breed':
    doBreed()
    break
  case 'retire':
    doRetire()
    break
  case 'take':
    doTake()
    break
  case 'claim':
    out(claimReport())
    break
  case 'fit':
    out(fitReport())
    break
  case 'pool': {
    const { board } = bench()
    const held = new Set(board.meaning.filter(Boolean))
    const only = args.from ?? ''
    for (const want of readPool(held).filter(
      w => !only || w.from.startsWith(only),
    )) {
      out(want.meaning)
    }
    break
  }
  case 'seed':
    doSeed()
    break
  case 'story':
    doStory()
    break
  default:
    out(`unknown command ${WHAT}`)
    out(
      'try: rank, mirror, base, ceiling, claim, fit, evolve, seed, story',
    )
}
