/**
 * Words that are probably not base words, parked until they have a home.
 *
 *   base/v4/term/doubtful.english.csv   term,why
 *   base/v4/term/doubtful.english.txt   the same, column aligned
 *
 * A third bucket exists because two were not enough. A word can fail to
 * be a base word in two very different ways:
 *
 *   DERIVABLE   it comes apart into parts the lexicon already has.
 *               `zebra` is a stripe horse. That is settled, and the
 *               breakdown is in `derivable.english.csv`.
 *
 *   DOUBTFUL    it does not come apart, and it still should not have a
 *               root. `aspirin` is one morpheme and no amount of
 *               stripe-plus-horse makes it anything else. It is a brand
 *               name for a molecule. Whatever Tune does with it, a
 *               three-letter root is not it.
 *
 * **Parking is the point.** These are not rejected, they are set aside,
 * because deciding what a conlang does with `dna` and `tylenol` is a
 * real design question and it is not the same question as choosing the
 * 4,096.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:doubt
 */

import { parse } from 'csv-parse/sync'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')

const rows: Array<Record<string, string>> = parse(
  readFileSync(resolve(TERM, 'candidate.english.csv'), 'utf-8'),
  { columns: true, skip_empty_lines: true, relax_column_count: true },
)
const known = new Set(rows.map(r => (r.term ?? '').trim()).filter(Boolean))

// ─── The tests ──────────────────────────────────────────

/**
 * Each test names one reason a word does not belong in a lexicon of
 * 4,096 roots. They are ordered, and the first that fires wins, so the
 * reason recorded is the most specific one.
 */
const TEST: Array<[string, (word: string) => boolean]> = [
  [
    'named molecule or drug',
    w =>
      /(?:ine|ase|ose|ide|ate|ol|yl|amine|acid)$/.test(w) &&
      MOLECULE.has(w),
  ],
  ['brand name', w => BRAND.has(w)],
  ['chemical element', w => ELEMENT.has(w)],
  ['unit of measure', w => UNIT.has(w)],
  ['named after a person or place', w => EPONYM.has(w)],
  ['initialism', w => INITIALISM.has(w)],
  ['modern technology, may not last', w => MODERN.has(w)],
  ['a discipline, which is a field plus study', w => FIELD.has(w)],
  ['clinical or taxonomic jargon', w => JARGON.has(w)],
]

const MOLECULE = new Set(
  `aldehyde ketone alcohol ester ether amine amide phenol alkane alkene
   alkyne benzene glucose fructose sucrose lactose starch cellulose
   protein enzyme peptide hormone steroid lipid acid alkali salt
   carbohydrate chlorophyll hemoglobin insulin adrenaline dopamine
   serotonin melatonin keratin collagen caffeine nicotine morphine
   codeine quinine histamine antibody antigen enzyme cholesterol
   calcium sodium potassium chloride sulfate nitrate carbonate
   ammonia methane ethanol acetone formaldehyde`.split(/\s+/),
)

const BRAND = new Set(
  `aspirin tylenol advil xerox kleenex velcro band-aid thermos escalator
   zipper aspirin heroin`.split(/\s+/),
)

const ELEMENT = new Set(
  `hydrogen helium lithium beryllium boron carbon nitrogen oxygen
   fluorine neon magnesium aluminum silicon phosphorus sulfur chlorine
   argon potassium calcium titanium chromium manganese cobalt nickel
   zinc gallium arsenic selenium bromine krypton silver cadmium tin
   antimony iodine xenon barium platinum mercury thallium lead bismuth
   radium uranium plutonium`.split(/\s+/),
)

const UNIT = new Set(
  `meter metre liter litre gram kilogram kilometer centimeter
   millimeter mile yard foot inch acre gallon quart pint ounce pound
   ton celsius fahrenheit kelvin volt watt ampere ohm joule newton
   pascal hertz decibel calorie byte gigabyte megabyte percent degree`.split(
    /\s+/,
  ),
)

const EPONYM = new Set(
  `vulcanise vulcanize pasteurize galvanize mesmerize boycott sandwich
   guillotine silhouette nicotine saxophone diesel watt volt ampere ohm
   newton pascal hertz celsius fahrenheit kelvin braille morse
   mars venus mercury jupiter saturn neptune pluto uranus january
   february march april may june july august september october
   november december monday tuesday wednesday thursday friday saturday
   sunday america europe asia africa christ jesus buddha`.split(/\s+/),
)

const INITIALISM = new Set(
  `dna rna atp ph tv gps usb pdf url html css api cpu ram led laser
   radar sonar scuba nasa aids hiv`.split(/\s+/),
)

const MODERN = new Set(
  `computer internet website email software hardware database server
   browser smartphone telephone television radio camera video film
   photograph automobile airplane helicopter rocket satellite battery
   engine motor turbine transistor microchip robot algorithm`.split(
    /\s+/,
  ),
)

const FIELD = new Set(
  `biology chemistry physics geology astronomy psychology sociology
   anthropology economics mathematics geometry algebra calculus
   philosophy theology medicine surgery botany zoology ecology genetics
   linguistics grammar history geography archaeology architecture
   engineering agriculture`.split(/\s+/),
)

const JARGON = new Set(
  `testis testicle mammal reptile amphibian arthropod mollusk vertebrate invertebrate
   bacterium virus fungus organism cell nucleus chromosome gene
   molecule atom electron proton neutron isotope tissue organ artery
   vein capillary neuron synapse cortex cerebellum diagnosis prognosis
   syndrome pathology therapy vaccine antibiotic anesthesia`.split(
    /\s+/,
  ),
)

// ─── Build ──────────────────────────────────────────────

type Row = { term: string; why: string }
const out: Array<Row> = []
const seen = new Set<string>()

for (const word of known) {
  for (const [why, test] of TEST) {
    if (!test(word)) continue
    if (seen.has(word)) break
    seen.add(word)
    out.push({ term: word, why })
    break
  }
}

/** Parked words that are not candidates yet, so the file is complete. */
for (const set of [MOLECULE, BRAND, ELEMENT, UNIT, INITIALISM]) {
  for (const word of set) {
    if (seen.has(word) || known.has(word)) continue
    seen.add(word)
    out.push({ term: word, why: 'not a candidate, parked for the record' })
  }
}

out.sort((a, b) => a.why.localeCompare(b.why) || a.term.localeCompare(b.term))

const csv = ['term,why']
for (const row of out) {
  csv.push(`${row.term},${row.why}`)
}
writeFileSync(
  resolve(TERM, 'doubtful.english.csv'),
  `${csv.join('\n')}\n`,
)

const wide = Math.max(4, ...out.map(r => r.term.length))
const txt = [
  `${'term'.padEnd(wide)}  why`,
  `${'-'.repeat(wide)}  ${'-'.repeat(40)}`,
]
for (const row of out) {
  txt.push(`${row.term.padEnd(wide)}  ${row.why}`)
}
writeFileSync(
  resolve(TERM, 'doubtful.english.txt'),
  `${txt.join('\n')}\n`,
)

const byWhy = new Map<string, number>()
for (const row of out) {
  byWhy.set(row.why, (byWhy.get(row.why) ?? 0) + 1)
}
console.log('| why | count |')
console.log('| :--- | ---: |')
for (const [why, count] of [...byWhy.entries()].sort(
  (a, b) => b[1] - a[1],
)) {
  console.log(`| ${why} | ${count} |`)
}
console.log('')
const onList = out.filter(r => known.has(r.term)).length
console.log(
  `${out.length} parked, ${onList} of them currently on the candidate list.`,
)
console.log(`wrote ${resolve(TERM, 'doubtful.english.csv')}`)
console.log(`wrote ${resolve(TERM, 'doubtful.english.txt')}`)
