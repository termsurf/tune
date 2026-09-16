/**
 * Common concepts that are in NEITHER the candidate list nor the
 * derivable file.
 *
 *   please make sure NO COMMON BASE CONCEPTS ARE MISSING
 *
 * Finding them one at a time by reading 3,400 rows does not converge.
 * This tests a curated vocabulary, organised by domain, against both
 * files at once and reports what has no home in either.
 *
 * ## Three ways a word goes missing, and this finds all of them
 *
 * **Never in a source.** `vortex` and `turbulent` were in none of the
 * six lists that were merged.
 *
 * **Eaten by a false positive.** `spiral` was added by hand and then
 * derived away as `spire + like`, which is wrong and silent. Everything
 * added to `MINE` is at risk of this, so a check that only looks at
 * `MINE` would miss it.
 *
 * **Parked as doubtful.** `computer` was filed under modern technology
 * and is plainly a base word.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:gap
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')

function readTerms(file: string): Set<string> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return new Set()
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return new Set(
    rows.map(r => (r.term ?? '').trim().toLowerCase()).filter(Boolean),
  )
}

const candidate = readTerms('candidate.english.csv')
const derivable = readTerms('derivable.english.csv')
const doubtful = readTerms('doubtful.english.csv')

/**
 * The vocabulary a language of 4,096 roots has to be able to reach.
 *
 * Organised by domain so a whole area cannot be forgotten at once, which
 * is how the sound words and the interjections were both missed.
 */
const DOMAIN: Record<string, string> = {
  being: `be exist live die birth death grow decay change become
    remain stay happen occur cause effect start end continue stop`,

  mind: `think know learn teach remember forget understand believe
    doubt guess reason judge decide choose want need hope fear
    imagine dream wonder notice ignore focus mind idea thought`,

  feel: `feel love hate like want joy sad angry afraid calm glad
    proud shame guilt pity envy hope trust worry relax suffer enjoy`,

  sense: `see hear smell taste touch look watch listen feel sense
    light dark loud quiet sweet sour bitter salty soft hard rough
    smooth warm cold hot cool wet dry clean dirty`,

  body: `body head face eye ear nose mouth tooth tongue lip neck
    shoulder arm hand finger chest back belly leg knee foot toe
    skin hair bone blood heart brain lung gut nerve muscle`,

  move: `go come move walk run jump fly swim climb fall rise turn
    stop carry push pull throw catch lift drop enter exit pass
    follow lead flow drift spin roll slide swing shake`,

  do: `do make build break cut join split open shut fix bend fold
    tie bind hold give take put get keep send bring use work play
    try help hurt kill save clean wash cook eat drink`,

  speak: `say speak talk tell ask answer call shout whisper sing
    read write name mean word language sound voice story`,

  people: `person people man woman child baby parent mother father
    kin friend enemy stranger group crowd team leader king queen
    self other body soul spirit`,

  place: `place here there near far in out up down front back left
    right side top bottom middle center edge inside outside above
    below between among around through across along toward away`,

  time: `time now then before after day night morning evening year
    season hour moment always never often sometimes early late
    old new young fast slow begin end long short`,

  number: `one two three four five six seven eight nine ten zero
    all some none many few more less most least count number
    half whole part each every both same different`,

  nature: `sun moon star sky cloud rain snow wind storm fire water
    ice earth stone rock sand soil dust mountain hill valley river
    lake sea ocean shore island forest tree grass leaf root seed
    flower fruit`,

  animal: `animal beast bird fish snake worm bug bee ant fly spider
    dog cat cow pig horse sheep goat deer wolf bear fox mouse rat
    hare ape whale seal bat lion elephant monkey egg nest wing tail
    horn claw feather fur`,

  thing: `thing object stuff matter form shape size line point
    circle square round flat straight curve hole edge surface
    tool box bag rope stick wheel knife cloth metal wood glass
    paper oil salt food house door window wall road`,

  quality: `good bad big small long short wide narrow thick thin
    heavy light strong weak full empty rich poor true false right
    wrong easy hard simple complex clear vague whole broken alive
    dead safe danger free stuck open closed`,

  social: `family home town city land country law rule order right
    duty owe debt gift trade buy sell price money work job pay
    war peace fight help share give take own have lack`,

  spirit: `god spirit soul holy sacred pray bless curse sin virtue
    faith doubt truth lie wisdom folly fate luck magic dream
    heaven hell`,

  relate: `same different like unlike equal more less with without
    and or not if then because so but also only even still yet
    cause effect part whole belong contain hold link join separate`,

  flow: `flow spiral vortex turbulent wave ripple swirl current
    stream tide surge pulse beat rhythm cycle loop spin twist
    bend curve spread gather scatter`,

  make: `computer machine engine wheel tool craft art skill design
    plan model pattern code number letter mark sign symbol map
    picture image copy`,
}

const KNOWN = new Set([...candidate, ...derivable])

const missing: Array<[string, Array<string>]> = []
let tested = 0

for (const [domain, text] of Object.entries(DOMAIN)) {
  const words = [...new Set(text.split(/\s+/).filter(Boolean))]
  tested += words.length
  const gone = words.filter(w => !KNOWN.has(w))
  if (gone.length) {
    missing.push([domain, gone])
  }
}

console.log(`tested ${tested} common concepts across ${Object.keys(DOMAIN).length} domains`)
console.log('')

if (missing.length === 0) {
  console.log('Nothing missing. Every one has a home.')
} else {
  const total = missing.reduce((n, [, g]) => n + g.length, 0)
  console.log(`MISSING: ${total}`)
  console.log('')
  for (const [domain, gone] of missing) {
    console.log(`  ${domain.padEnd(10)} ${gone.join(' ')}`)
  }
  console.log('')
  const parked = missing
    .flatMap(([, g]) => g)
    .filter(w => doubtful.has(w))
  if (parked.length) {
    console.log(
      `  ${parked.length} of them are parked as doubtful: ${parked.join(' ')}`,
    )
  }
}
