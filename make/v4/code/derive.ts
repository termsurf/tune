/**
 * Words that do not need a root, and what they are made of instead.
 *
 * A base word has to be irreducible. Everything else is built, and this
 * is the record of HOW, so the same words do not creep back onto the
 * candidate list every few months.
 *
 *   base/v4/term/derivable.english.csv   term,parts,how
 *   base/v4/term/derivable.english.txt   the same, column aligned
 *
 * ## Three ways a word comes apart
 *
 * **compound** — transparent in English. `limestone` is lime plus stone,
 * `starfish` is star plus fish. Found mechanically: the word splits into
 * two pieces that are both already candidates.
 *
 * **affix** — derivational morphology. `weaver` is weave plus an agent,
 * `kindness` is kind plus a quality. Tune builds these with the last
 * word of a phrase naming the kind, so `kind.csv` already holds the
 * second half. Found mechanically from a suffix table.
 *
 * **sense** — not transparent in English, but transparent once you say
 * what the thing IS. `elk` is a big deer. `zebra` is a stripe horse.
 * `volcano` is a fire mountain, which is exactly how Chinese writes it.
 * **No algorithm finds these**, so they are written by hand below.
 *
 * The third kind is the one that matters most, because those are the
 * words that look irreducible in English and are not.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:derive
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')

// ─── The candidate list ─────────────────────────────────

/**
 * The whole pool, not the filtered candidate list.
 *
 * `all.english.txt` is everything `english.ts` merged, before anything
 * was excluded. Reading `candidate.english.csv` here instead made the
 * two generators oscillate, because that file is this file's own output
 * applied backwards.
 */
const words = readFileSync(resolve(TERM, 'all.english.txt'), 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
const known = new Set(words)

// ─── Affixes ────────────────────────────────────────────

/**
 * Suffix to the kind it names.
 *
 * The right hand side is a KIND from `kind.csv` wherever one fits, so a
 * derivable word reads as the phrase Tune would actually build. Order
 * matters: the longest suffix has to be tried first, or `-ness` is found
 * inside `-iness` and the stem comes out wrong.
 */
const SUFFIX: Array<[string, string]> = [
  ['ization', 'act'],
  ['ization', 'process'],
  ['ousness', 'nature'],
  ['iveness', 'nature'],
  ['fulness', 'nature'],
  ['ability', 'ability'],
  ['ibility', 'ability'],
  ['ational', 'like'],
  ['ically', 'manner'],
  ['ation', 'act'],
  ['ition', 'act'],
  ['ement', 'act'],
  ['ности', 'nature'],
  ['ness', 'nature'],
  ['ment', 'act'],
  ['tion', 'act'],
  ['sion', 'act'],
  ['ion', 'act'],
  ['ance', 'act'],
  ['ence', 'act'],
  ['ship', 'state'],
  ['dom', 'state'],
  ['hood', 'state'],
  ['less', 'without'],
  ['ful', 'full'],
  ['ish', 'like'],
  ['ist', 'agent'],
  ['ician', 'agent'],
  ['cian', 'agent'],
  ['ism', 'practice'],
  ['ity', 'nature'],
  // `accuracy` cuts to `accur`, and `stemsOf` reaches `accurate`.
  ['acy', 'nature'],
  // `readable` is read plus able. Only `-ibility` was here, so the
  // plain adjective it is built from was never caught.
  ['ant', 'agent'],
  ['ent', 'agent'],
  ['able', 'able'],
  ['ible', 'able'],
  ['ous', 'like'],
  ['ive', 'like'],
  ['ary', 'like'],
  // Before `ic`, so `whimsical` cuts to `whims` and reaches `whimsy`
  // rather than stopping at `whimsic` and finding nothing.
  ['ical', 'like'],
  ['ic', 'like'],
  ['al', 'like'],
  // The causative. `widen` is wide plus make, `whiten` is white plus
  // make, and the whole class was missing: darken harden soften
  // strengthen shorten deepen sharpen loosen tighten weaken brighten.
  ['en', 'make'],
  ['er', 'agent'],
  ['or', 'agent'],
  ['ee', 'target'],
  ['ly', 'manner'],
  // The gerund. `wedding` is wed plus an event, `building` is build plus
  // an act. Another whole class that was missing.
  ['ing', 'act'],
  // `modernize` is modern plus make. Another causative, spelled two ways.
  ['ify', 'make'],
  ['fy', 'make'],
  ['ize', 'make'],
  ['ise', 'make'],
  // Inflection, not derivation, and it should never have been a
  // candidate. `allowed` is a tense on `allow`, and Tune marks tense
  // with its own word rather than by changing the root.
  ['ed', 'done'],
  ['y', 'like'],
]

/**
 * Undo the spelling changes English makes before a suffix.
 *
 * The `-ate` reconstruction is the one that earns its place. Without it
 * `retaliation` does not resolve, because the stem is not `retali` but
 * `retaliate`, and the same holds for hundreds of Latin verbs. **The
 * root is the base word and the nominalisation is built**, so a detector
 * that cannot find the root leaves the wrong half in the lexicon.
 */
function stemsOf(cut: string): Array<string> {
  // `necessity` cuts to `necess` and the root is `necessary`, which no
  // other rule here reaches. `-ous` and `-ic` stems the same way.
  const out = [
    cut,
    `${cut}e`,
    `${cut}ate`,
    `${cut}y`,
    `${cut}ze`,
    `${cut}ary`,
    `${cut}ous`,
    `${cut}ic`,
    // `distribution` cuts to `distribu` and the root is `distribute`.
    `${cut}te`,
    // `scientist` cuts to `scient` and the root is `science`.
    `${cut}ce`,
  ]
  // `scient` -> `science`, `elegant` -> `elegance`.
  if (cut.endsWith('t')) {
    out.push(`${cut.slice(0, -1)}ce`)
  }
  if (cut.endsWith('i')) {
    const y = cut.slice(0, -1)
    out.push(`${y}y`, `${y}e`, y)
  }
  // `running` -> `run`, `bigger` -> `big`
  if (cut.length > 2 && cut[cut.length - 1] === cut[cut.length - 2]) {
    out.push(cut.slice(0, -1))
  }
  // English drops the vowel before a final `r` or `l` when a suffix
  // follows, so `angry` cuts to `angr` and the root is `anger`. Put the
  // vowel back. Also `hungry`, `simply`, `assembly`.
  if (/[bcdfgklmnpstvz][rl]$/.test(cut)) {
    out.push(`${cut.slice(0, -1)}e${cut[cut.length - 1]}`)
  }
  return out
}

/**
 * Words that end in a suffix and are not built from one.
 *
 * `flower` is not `flow` plus an agent. `holy` is not `hol` plus a
 * quality. `coral`, `mother`, `water`, `very` are all roots that happen
 * to end the way a derived word ends, and the detector cannot tell from
 * the spelling alone.
 *
 * The missing-parts check is what surfaced this: `flower` was excluded
 * as derivable, and then four flowers needed it as a part and could not
 * find it. **A breakdown that consumes its own ingredients is wrong**,
 * and that check catches it without anyone reading 400 rows.
 */
const NOT_DERIVED = new Set(
  `flower holy coral water power paper corner mother father brother
   sister daughter finger winter summer river silver number member
   letter matter center order under after other over ever never very
   every only early body city story study family money enemy army baby
   lady party duty beauty safety dirty empty happy heavy
   silly lucky tiny copy carry marry worry hurry bury deny apply reply
   supply enter offer suffer differ cover discover remember consider
   answer master monster ladder shoulder thunder wonder weather feather
   leather gather rather together whether another better bitter butter
   chapter character computer daughter disaster doctor dollar error
   favor flavor honor humor labor major minor mirror motor neighbor
   odor rumor sailor senator sponsor tailor terror tutor vapor vigor
   anger danger finger hunger linger tiger timber trigger cellar collar
   parent present moment talent silent recent decent absent urgent
   patient ancient content client accident incident student instrument
   dollar pillar scholar similar solar sugar vinegar cedar altar
   children kitchen garden golden wooden often listen open even seven
   heaven queen green screen between citizen woman women oxen linen
   token kitten oven raven siren omen burden warren maiden sudden
   hidden ridden bitten written eaten fallen given taken broken spoken
   frozen chosen driven risen stolen woven swollen
   evening morning willing ceiling herring sterling darling sibling
   pudding during nothing something everything anything
   wicked sacred hundred hatred naked crooked rugged ragged jagged
   blessed cursed learned aged beloved`.split(/\s+/),
)

/**
 * Grammar, not concepts.
 *
 * `whose` is the possessive of `who`. It is a form the grammar makes,
 * and a language that builds possession out of a marker never needs a
 * root for it. The same goes for the other inflected pronouns and the
 * irregular comparatives.
 */
const GRAMMAR = new Set(
  `whose whom him her hers his its theirs ours yours mine me us them
   himself herself itself myself yourself ourselves themselves
   better best worse worst further furthest elder eldest
   am are is was were been being does did done has had having
   shall should would could might must ought`.split(/\s+/),
)

/**
 * Built from a root, and no longer MEANING what that root means.
 *
 *   why missing many words still, like "formal"
 *
 * `formal` is `form` plus `-al` and the detector is right about the
 * spelling. It is wrong about the word: formal means ceremonious and
 * official, which is not "form-like" in any sense a speaker would
 * recover. The meaning has drifted off the morphology and left it
 * behind.
 *
 * **A derivation that a speaker cannot run in reverse is not a
 * derivation.** These keep their roots, and the split from `NOT_DERIVED`
 * matters: those words were never built at all, these were built and
 * then wandered off.
 */
const DRIFTED = new Set(
  `spiral formal natural material critical physical moral legal final normal
   vital general special official personal social national capital
   central local medical mental musical original political practical
   radical royal rural spiritual technical typical universal usual
   visual serial spectacle article novel model label metal signal
   several severe secure sincere serious curious obvious anxious
   nervous famous various precious jealous
   company complex compound conduct content contract
   fortune fabric factor family fashion feature figure future`.split(
    /\s+/,
  ),
)

function byAffix(word: string): { parts: string; how: string } | null {
  if (NOT_DERIVED.has(word) || DRIFTED.has(word)) return null
  for (const [suffix, kind] of SUFFIX) {
    if (!word.endsWith(suffix)) continue
    const cut = word.slice(0, -suffix.length)
    if (cut.length < 3) continue
    for (const stem of stemsOf(cut)) {
      if (known.has(stem) && stem !== word) {
        return { parts: `${stem} + ${kind}`, how: 'affix' }
      }
    }
  }
  return null
}

// ─── Prefixes ───────────────────────────────────────────

/**
 * The front of a word, which had no handling at all until now.
 *
 *   untouch untreat unverify unwant, not base
 *
 * Every one of those is `un` plus a verb, and the detector only ever
 * looked at endings. **A whole half of English morphology was invisible
 * to it**, which is why four negated verbs were sitting on the candidate
 * list looking irreducible.
 */
const PREFIX: Array<[string, string]> = [
  ['un', 'not'],
  ['non', 'not'],
  ['dis', 'not'],
  ['mis', 'wrong'],
  ['re', 'again'],
  ['pre', 'before'],
  ['post', 'after'],
  ['over', 'too much'],
  ['under', 'too little'],
  ['anti', 'against'],
  ['semi', 'half'],
  ['multi', 'many'],
  ['inter', 'between'],
  ['trans', 'across'],
  ['sub', 'below'],
  ['super', 'above'],
  ['co', 'with'],
]

/**
 * Words that start with a prefix and are not built from one.
 *
 * `record` is not `re` plus `cord`, `report` is not `re` plus `port`,
 * `remain` is not `re` plus `main`. The spelling is a coincidence and
 * the second half is a real word, which is exactly the case a splitter
 * gets wrong.
 */
const NOT_PREFIXED = new Set(
  `uncle union unit unite universe unique until unless under upon
   record report remain repeat result return research resource
   religion remember represent require reserve resist respect respond
   restore retire reveal review reward present president pretty
   prevent prepare precise predict prefer press price prince print
   prison private prize problem process produce profit program
   project promise proper protect proud prove provide public
   discuss disease display distance district disk dish
   commit common company compare complete computer concert condition
   conduct confirm connect consider contact contain content contest
   context continue contract control convince cover
   interest internal interior international
   subject submit substance subtle success suggest summer supply
   support suppose surface surprise survive
   overall overcome
   nonsense unravel understand understood undergo undertake undo
   underneath undermine underline uncover unless unusual`.split(/\s+/),
)

function byPrefix(word: string): { parts: string; how: string } | null {
  if (NOT_PREFIXED.has(word)) return null
  for (const [prefix, gloss] of PREFIX) {
    if (!word.startsWith(prefix)) continue
    const rest = word.slice(prefix.length)
    if (rest.length < 3) continue
    if (known.has(rest) && rest !== word) {
      return { parts: `${gloss} + ${rest}`, how: 'prefix' }
    }
  }
  return null
}

// ─── Compounds ──────────────────────────────────────────

function byCompound(word: string): { parts: string; how: string } | null {
  if (word.length < 6) return null
  for (let at = 3; at <= word.length - 3; at++) {
    const left = word.slice(0, at)
    const right = word.slice(at)
    if (known.has(left) && known.has(right)) {
      return { parts: `${left} + ${right}`, how: 'compound' }
    }
  }
  return null
}

// ─── Clippings ──────────────────────────────────────────

/**
 * The same word, shortened. A fourth way a word fails to be a root.
 *
 *   tech and technology are the same
 *
 * `tech` is not built out of `technology`, it IS `technology` with the
 * end cut off. That is not a compound, not an affix and not a sense
 * breakdown, so it needs its own category or the file says nothing
 * useful about it.
 *
 * **Both halves of a clipping pair are candidates, and at most one can
 * survive.** Which one is a separate question from whether they are the
 * same word, and the short form is not automatically the winner:
 * `technology` is itself `craft + study` and comes apart further, while
 * `bike` is the whole of what `bicycle` means and the long form is the
 * one carrying dead Latin.
 */
const CLIPPING: Array<[string, string]> = [
  ['tech', 'technology'],
  ['ad', 'advertisement'],
  ['app', 'application'],
  ['auto', 'automobile'],
  ['bike', 'bicycle'],
  ['bus', 'omnibus'],
  ['cab', 'cabriolet'],
  ['demo', 'demonstration'],
  ['doc', 'doctor'],
  ['exam', 'examination'],
  ['flu', 'influenza'],
  ['fridge', 'refrigerator'],
  ['gym', 'gymnasium'],
  ['info', 'information'],
  ['lab', 'laboratory'],
  ['math', 'mathematics'],
  ['maths', 'mathematics'],
  ['memo', 'memorandum'],
  ['phone', 'telephone'],
  ['photo', 'photograph'],
  ['plane', 'airplane'],
  ['prof', 'professor'],
  ['pub', 'public house'],
  ['stats', 'statistics'],
  ['vet', 'veterinarian'],
  ['ref', 'referee'],
  ['sub', 'submarine'],
  ['limo', 'limousine'],
  ['piano', 'pianoforte'],
  ['zoo', 'zoological garden'],
  ['deli', 'delicatessen'],
  ['condo', 'condominium'],
  ['rhino', 'rhinoceros'],
  ['hippo', 'hippopotamus'],
  ['mic', 'microphone'],
  ['mike', 'microphone'],
  ['ammo', 'ammunition'],
  ['combo', 'combination'],
  ['promo', 'promotion'],
  ['intro', 'introduction'],
  ['veggie', 'vegetable'],
  ['fax', 'facsimile'],
  ['movie', 'moving picture'],
  ['taxi', 'taximeter cab'],
]

// ─── Sense ──────────────────────────────────────────────

/**
 * What a word IS, written out, for the ones English hides.
 *
 * This is the half no algorithm reaches. `elk` looks like a root in
 * English and is a big deer in fact, so Tune builds it and spends no
 * root on it. Chinese writes many of these openly, which is the model:
 * `volcano` is fire mountain, `computer` is lightning brain.
 *
 * The rule for what belongs here: **if the parts are already candidates
 * and a speaker who knew only the parts would understand the whole**,
 * it goes here rather than in the lexicon.
 */
const SENSE: Array<[string, string]> = [
  /**
   * The irregular nominalisations, which no suffix rule reaches.
   *
   * English forms these with a vowel change and a `-t` or `-th`, so the
   * stem is not recoverable by cutting letters off the end: `weight` is
   * `weigh` plus a measure, and `weigh` is not a prefix of it.
   *
   * A productive class worth writing out, because every one of them is a
   * root plus a kind that Tune already builds.
   */
  /**
   * The parts of speech, which are all a role plus a term.
   *
   * A language that names its own grammar out of its own words does not
   * need a root for each category, and Tune already has `term` and the
   * roles.
   */
  ['advertise', 'notice + make'],
  ['aloud', 'out + loud'],
  ['technology', 'craft + study'],
  // Latin `-ible` words whose stem is not the English verb, so cutting
  // letters reaches nothing. `vis` is not a word here, `see` is.
  // The `vary` family, none of which a suffix rule reaches, because the
  // stem loses its `y` and the endings are all different.
  /**
   * The animal calls, off two primitives.
   *
   *   we need a base word for quick-sound, but not beep, maybe beep,
   *   then we can get rid of tweet/chirp, can just have "bird beep"
   *
   * `beep` is the short high sound and `call` is an animal's voice, and
   * between them the whole barnyard comes out. Every one of these is a
   * creature plus a sound, and English spends a separate opaque root on
   * each of them for no reason Tune has to copy.
   *
   * `tweet` and `chirp` land on the same parts, which is correct: they
   * are the same noise and English keeps two words out of habit.
   */
  ['tweet', 'bird + beep'],
  ['chirp', 'bird + beep'],
  ['meow', 'cat + call'],
  ['purr', 'cat + hum'],
  ['moo', 'cow + call'],
  ['oink', 'pig + call'],
  ['quack', 'duck + call'],
  ['hoot', 'owl + call'],
  ['neigh', 'horse + call'],
  ['bleat', 'sheep + call'],
  ['cluck', 'hen + call'],
  ['growl', 'beast + low + call'],
  ['bray', 'small + horse + call'],
  ['croak', 'frog + call'],
  ['squawk', 'bird + screech'],
  ['caw', 'crow + call'],
  ['whinny', 'horse + call'],

  /**
   * The Latin stem alternations.
   *
   * English borrowed the verb from one Latin stem and the noun from
   * another, so the two share a meaning and not a spelling: `destroy`
   * and `destruction`, `describe` and `description`, `receive` and
   * `reception`, `decide` and `decision`. **No amount of cutting letters
   * off the end gets from one to the other**, so every one is written
   * out by hand.
   *
   * This is the largest hand-written family in the file and it is not
   * finished. The pattern to look for: a `-tion`, `-sion`, `-tor` or
   * `-sis` noun whose verb is spelled differently in the middle.
   */
  ['destruction', 'destroy + act'],
  ['destructive', 'destroy + like'],
  ['description', 'describe + act'],
  ['subscription', 'subscribe + act'],
  ['prescription', 'prescribe + act'],
  ['inscription', 'inscribe + act'],
  ['reception', 'receive + act'],
  ['deception', 'deceive + act'],
  ['conception', 'conceive + act'],
  ['perception', 'perceive + act'],
  ['production', 'produce + act'],
  ['reduction', 'reduce + act'],
  ['introduction', 'introduce + act'],
  ['decision', 'decide + act'],
  ['division', 'divide + act'],
  ['provision', 'provide + act'],
  ['revision', 'revise + act'],
  ['collision', 'collide + act'],
  ['explosion', 'explode + act'],
  ['invasion', 'invade + act'],
  ['persuasion', 'persuade + act'],
  ['conclusion', 'conclude + act'],
  ['inclusion', 'include + act'],
  ['confusion', 'confuse + act'],
  ['admission', 'admit + act'],
  ['permission', 'permit + act'],
  ['transmission', 'transmit + act'],
  ['submission', 'submit + act'],
  ['omission', 'omit + act'],
  ['emission', 'emit + act'],
  ['dictator', 'dictate + agent'],
  ['diagnosis', 'diagnose + act'],
  ['devout', 'devote + like'],

  ['toxin', 'toxic + thing'],
  ['denim', 'blue + cloth'],
  ['pancreas', 'gut + gland'],
  ['oxygen', 'breath + gas'],
  ['orientation', 'orient + act'],
  ['newt', 'water + lizard'],
  ['cargo', 'carry + load'],
  ['sinew', 'muscle + cord'],
  ['tendon', 'muscle + cord'],
  ['saga', 'long + story'],
  ['physics', 'matter + study'],
  // Greek philo-sophia. The word says it.
  ['philosophy', 'wisdom + love'],
  // Latin petra + oleum, rock oil, which is what it is.
  ['petroleum', 'rock + oil'],
  ['poem', 'art + word + work'],
  ['poet', 'art + word + agent'],
  ['placenta', 'birth + organ'],
  ['population', 'populate + act'],
  ['polarity', 'polar + nature'],
  ['pregnancy', 'pregnant + state'],
  ['pox', 'skin + disease'],
  ['probability', 'probable + nature'],
  ['primary', 'first + like'],
  ['priest', 'holy + agent'],
  ['president', 'lead + agent'],
  ['ability', 'able + nature'],
  ['possibility', 'possible + nature'],
  ['prostate', 'seed + gland'],
  ['pronunciation', 'pronounce + act'],
  ['quarrel', 'word + fight'],
  ['buoyancy', 'buoyant + nature'],
  ['caribou', 'snow + deer'],
  ['reindeer', 'snow + deer'],
  ['carriage', 'carry + vehicle'],
  ['casket', 'death + box'],
  ['coffin', 'death + box'],
  ['bridle', 'horse + head + strap'],
  ['blossom', 'tree + flower'],
  ['blotch', 'rough + spot'],
  ['blockade', 'block + act'],
  ['bishop', 'church + chief'],
  ['biological', 'life + study + like'],
  ['biology', 'life + study'],
  ['dinner', 'night + meal'],
  ['lunch', 'day + meal'],
  ['breakfast', 'morning + meal'],
  ['supper', 'night + meal'],
  ['utensil', 'eat + tool'],
  ['vocabulary', 'term + set'],
  ['dictionary', 'term + book'],
  ['glossary', 'term + list'],
  // `-ward` is an orientation marker, not a root, and the whole series
  // follows: upward downward inward outward forward backward homeward.
  ['upward', 'up + oriented'],
  ['downward', 'down + oriented'],
  ['inward', 'in + oriented'],
  ['outward', 'out + oriented'],
  ['forward', 'front + oriented'],
  ['backward', 'back + oriented'],
  ['toward', 'to + oriented'],
  ['onward', 'on + oriented'],
  ['westward', 'west + oriented'],
  ['eastward', 'east + oriented'],
  ['northward', 'north + oriented'],
  ['southward', 'south + oriented'],

  ['variety', 'vary + nature'],
  ['variant', 'vary + kind'],
  ['variable', 'vary + able'],
  ['various', 'vary + like'],
  ['vegetable', 'plant + food'],

  ['visible', 'see + able'],
  ['audible', 'hear + able'],
  ['edible', 'eat + able'],
  ['legible', 'read + able'],
  ['tangible', 'touch + able'],
  ['possible', 'can + able'],
  ['terrible', 'fear + able'],
  ['horrible', 'fear + able'],
  ['credible', 'believe + able'],
  ['feasible', 'do + able'],
  ['territory', 'rule + land'],

  /**
   * The ordinals, which are a number plus an order marker.
   *
   * `first`, `second` and `third` are suppletive in English, so no
   * suffix rule reaches them, and the regular `-th` ones are worth
   * writing out beside them rather than leaving the series half
   * mechanical and half hand made.
   */
  ['uncertainty', 'uncertain + nature'],

  /**
   * The numerals above fifteen, which are all built.
   *
   *   any number after 15 is not base, we should have 10^2 as base
   *   (100), 10^3 as base, and every 3rd power for 15 of them,
   *   max 10^45
   *
   * So the roots are `zero` through `fifteen`, then `hundred`, then the
   * powers stepping by three. Sixteen through nineteen are additive on
   * ten, and the tens are multiplicative, which is why `sixteen` and
   * `sixty` read in opposite orders.
   */
  ['sixteen', 'ten + six'],
  ['seventeen', 'ten + seven'],
  ['eighteen', 'ten + eight'],
  ['nineteen', 'ten + nine'],
  ['twenty', 'two + ten'],
  ['thirty', 'three + ten'],
  ['forty', 'four + ten'],
  ['fifty', 'five + ten'],
  ['sixty', 'six + ten'],
  ['seventy', 'seven + ten'],
  ['eighty', 'eight + ten'],
  ['ninety', 'nine + ten'],

  ['first', 'one + order'],
  ['second', 'two + order'],
  ['third', 'three + order'],
  ['fourth', 'four + order'],
  ['fifth', 'five + order'],
  ['sixth', 'six + order'],
  ['seventh', 'seven + order'],
  ['eighth', 'eight + order'],
  ['ninth', 'nine + order'],
  ['tenth', 'ten + order'],
  ['eleventh', 'eleven + order'],
  ['twelfth', 'twelve + order'],
  ['twentieth', 'twenty + order'],
  ['hundredth', 'hundred + order'],
  ['thousandth', 'thousand + order'],
  ['half', 'two + part'],
  ['quarter', 'four + part'],
  ['double', 'two + fold'],
  ['triple', 'three + fold'],
  ['twice', 'two + fold'],
  ['dozen', 'twelve + group'],

  // Latin pairs where the noun and the adjective share no spelling, so
  // no amount of cutting letters gets from one to the other.
  ['anxiety', 'anxious + nature'],
  ['analysis', 'analyze + act'],
  ['apologize', 'apology + make'],
  ['apologise', 'apology + make'],
  ['anniversary', 'year + loop + feast'],
  ['annual', 'year + loop + like'],
  // A rune code. The English word is the first two Greek letters said
  // in a row, which is the least translatable possible name for it.
  ['alphabet', 'letter + code'],
  ['noun', 'object + term'],
  ['verb', 'action + term'],
  ['adjective', 'nature + term'],
  ['adverb', 'manner + term'],
  ['pronoun', 'swap + term'],
  ['preposition', 'relation + term'],
  ['conjunction', 'join + term'],
  ['article', 'point + term'],
  ['sentence', 'thought + line'],
  ['phrase', 'word + group'],
  ['syllable', 'sound + beat'],
  ['vowel', 'open + sound'],
  ['consonant', 'close + sound'],

  ['weight', 'weigh + measure'],
  ['height', 'high + measure'],
  ['width', 'wide + measure'],
  ['depth', 'deep + measure'],
  ['length', 'long + measure'],
  ['breadth', 'broad + measure'],
  ['strength', 'strong + measure'],
  ['warmth', 'warm + nature'],
  ['health', 'whole + nature'],
  ['wealth', 'rich + nature'],
  ['truth', 'true + nature'],
  ['filth', 'foul + nature'],
  ['growth', 'grow + act'],
  ['flight', 'fly + act'],
  ['sight', 'see + act'],
  ['thought', 'think + act'],
  ['theft', 'steal + act'],
  ['gift', 'give + thing'],
  ['speech', 'speak + act'],
  ['choice', 'choose + act'],
  ['belief', 'believe + act'],
  ['proof', 'prove + act'],
  ['loss', 'lose + act'],
  ['sale', 'sell + act'],
  ['song', 'sing + thing'],
  ['blood', 'bleed + thing'],
  ['food', 'feed + thing'],
  ['seat', 'sit + thing'],
  ['gold', 'yellow + metal'],


  // Beasts, off the basis: deer wolf bear cat dog horse cow pig sheep
  // goat mouse rat hare ape whale seal bat fox lion.
  ['elk', 'big + deer'],
  ['moose', 'big + deer'],
  ['antelope', 'fast + deer'],
  ['gazelle', 'small + deer'],
  ['giraffe', 'long + neck + deer'],

  ['zebra', 'stripe + horse'],
  ['donkey', 'small + horse'],
  ['mule', 'mix + horse'],
  ['camel', 'hump + horse'],
  ['llama', 'mountain + hump + horse'],
  ['bison', 'wild + cow'],
  ['buffalo', 'wild + cow'],
  ['ox', 'work + cow'],
  ['leopard', 'spot + wild + cat'],
  ['cheetah', 'fast + wild + cat'],
  ['panther', 'dark + wild + cat'],
  ['lynx', 'small + wild + cat'],
  ['tiger', 'stripe + wild + cat'],
  ['hyena', 'laugh + wild + dog'],
  ['jackal', 'small + wild + dog'],
  ['otter', 'river + weasel'],
  ['beaver', 'wood + cut + river + rat'],
  ['dolphin', 'small + whale'],
  ['walrus', 'tusk + seal'],
  ['rabbit', 'small + hare'],
  ['squirrel', 'tree + rat'],
  ['hedgehog', 'thorn + rat'],
  ['mole', 'dirt + rat'],
  ['rhino', 'horn + beast'],
  ['hippo', 'river + beast'],

  // Birds, off the basis: bird crow duck hen owl eagle sparrow crane
  // dove goose.
  ['raven', 'big + crow'],
  ['magpie', 'black + white + crow'],
  ['hawk', 'small + eagle'],
  ['falcon', 'fast + eagle'],
  ['vulture', 'dead + eat + eagle'],
  ['swan', 'white + goose'],
  ['heron', 'river + crane'],
  ['stork', 'long + leg + crane'],
  ['pelican', 'bag + throat + bird'],
  ['penguin', 'ice + swim + bird'],
  ['ostrich', 'big + run + bird'],
  ['peacock', 'fan + tail + bird'],
  ['parrot', 'talk + bird'],
  ['pigeon', 'town + dove'],
  ['finch', 'small + sparrow'],
  ['robin', 'red + chest + sparrow'],
  ['wren', 'tiny + sparrow'],
  ['lark', 'sing + sparrow'],

  // Water and small life, off the basis: fish shark eel crab clam
  // octopus shrimp snail worm bee ant fly spider moth wasp.
  ['whale', ''],
  ['oyster', 'pearl + clam'],
  ['squid', 'long + octopus'],
  ['jellyfish', 'jelly + fish'],
  ['starfish', 'star + fish'],
  ['salmon', 'river + climb + fish'],
  ['trout', 'stream + fish'],
  ['eel', ''],
  ['slug', 'shell + less + snail'],
  ['hornet', 'big + wasp'],
  ['butterfly', 'day + moth'],
  ['beetle', 'shell + bug'],
  ['locust', 'swarm + bug'],
  ['flea', 'jump + bug'],
  ['louse', 'hair + bug'],
  ['termite', 'wood + ant'],
  ['scorpion', 'sting + tail + spider'],
  ['centipede', 'many + foot + worm'],

  // Plants, off the basis: tree grass leaf root seed flower fruit nut
  // berry moss fern vine reed thorn bark oak pine palm rose lily.
  ['cedar', 'red + pine'],
  ['fir', 'needle + pine'],
  ['spruce', 'needle + pine'],
  ['birch', 'white + bark + tree'],
  ['willow', 'weep + tree'],
  ['maple', 'sweet + sap + tree'],
  ['bamboo', 'hollow + grass'],
  ['ivy', 'wall + vine'],
  ['shrub', 'low + tree'],
  ['thistle', 'thorn + weed'],
  ['nettle', 'sting + weed'],
  ['clover', 'three + leaf + grass'],
  ['daisy', 'sun + flower'],
  ['tulip', 'cup + flower'],
  ['orchid', 'rare + flower'],
  ['lotus', 'water + lily'],
  ['poppy', 'sleep + flower'],
  ['mushroom', 'cap + fungus'],
  ['algae', 'water + moss'],
  ['lichen', 'stone + moss'],

  // Stone and metal, off the basis: rock stone sand clay iron gold
  // silver copper salt glass crystal gem.
  ['granite', 'hard + rock'],
  ['marble', 'smooth + stone'],
  ['slate', 'sheet + stone'],
  ['flint', 'spark + stone'],
  ['limestone', 'white + stone'],
  ['sandstone', 'sand + stone'],
  ['basalt', 'dark + rock'],
  ['obsidian', 'glass + rock'],
  ['quartz', 'clear + crystal'],
  ['ruby', 'red + gem'],
  ['emerald', 'green + gem'],
  ['sapphire', 'blue + gem'],
  ['diamond', 'hard + gem'],
  ['opal', 'shine + gem'],
  ['amber', 'tree + resin + stone'],
  ['pearl', 'shell + gem'],
  ['jade', 'green + stone'],
  ['bronze', 'copper + tin'],
  ['steel', 'hard + iron'],
  ['brass', 'yellow + copper'],
  ['coal', 'burn + stone'],

  // The sky, which is where the rule was first stated.
  ['mars', 'war + planet'],
  ['venus', 'love + planet'],
  ['mercury', 'fast + planet'],
  ['jupiter', 'king + planet'],
  ['saturn', 'ring + planet'],
  ['comet', 'tail + star'],
  ['meteor', 'fall + star'],
  ['galaxy', 'star + swarm'],
  ['nebula', 'star + cloud'],
  ['eclipse', 'shadow + sun'],
  ['solstice', 'sun + stand + day'],
  ['equinox', 'equal + night + day'],
  ['volcano', 'fire + mountain'],
  ['glacier', 'ice + river'],
  ['geyser', 'hot + water + spout'],
  ['oasis', 'water + desert'],
  ['delta', 'river + mouth + land'],
  ['lagoon', 'shut + sea'],
  ['fjord', 'deep + sea + valley'],
  ['tundra', 'cold + plain'],
  ['steppe', 'dry + plain'],
  ['prairie', 'grass + plain'],
  ['ravine', 'narrow + valley'],
  ['gorge', 'deep + valley'],
  ['dune', 'sand + hill'],
  ['reef', 'coral + ridge'],

  // People, which are all a role plus an agent.
  ['widow', 'dead + mate + woman'],
  ['orphan', 'no + parent + child'],
  ['shaman', 'spirit + talk + agent'],
  ['smith', 'metal + work + agent'],
  ['weaver', 'weave + agent'],
  ['potter', 'pot + make + agent'],
  ['herder', 'herd + agent'],
  ['sailor', 'sail + agent'],
  ['merchant', 'trade + agent'],
  ['beggar', 'beg + agent'],
  ['mentor', 'teach + agent'],
  ['apprentice', 'learn + agent'],
  ['novice', 'new + agent'],
  ['villain', 'bad + person'],
  ['hero', 'brave + person'],
  ['stranger', 'unknown + person'],
  ['neighbor', 'near + person'],
  ['ancestor', 'before + kin'],
  ['descendant', 'after + kin'],
  ['wanderer', 'wander + agent'],

  // Things English keeps in one lump and Chinese does not.
  ['computer', 'count + machine'],
  ['telephone', 'far + talk + machine'],
  ['train', 'fire + cart'],
  ['pyramid', 'point + tomb'],
  ['obelisk', 'needle + pillar'],
  ['aqueduct', 'water + road'],
  ['cistern', 'water + hold + pit'],
  ['rampart', 'war + wall'],
  ['citadel', 'high + fortress'],
  ['lyre', 'string + music + tool'],
  ['hymn', 'god + song'],
  ['tambourine', 'shake + drum'],
  ['nightingale', 'night + sing + bird'],
  ['woodpecker', 'wood + peck + bird'],
  ['kingfisher', 'king + fish + bird'],
  ['grasshopper', 'grass + hop + bug'],
  ['dragonfly', 'dragon + fly'],
  ['witchcraft', 'witch + craft'],
  ['homeland', 'home + land'],
  ['underworld', 'under + world'],
  ['livelihood', 'live + way'],
  ['foresight', 'before + sight'],
  ['hindsight', 'after + sight'],
  ['tessellation', 'tile + pattern'],
  ['circumference', 'around + line'],
  ['hemisphere', 'half + sphere'],
  ['surplus', 'extra + amount'],
  ['urn', 'ash + pot'],
  ['kiln', 'fire + oven'],
  ['bristle', 'stiff + hair'],
  ['bounty', 'gift + pay'],
  ['barter', 'thing + trade'],
  ['anvil', 'iron + block'],
  ['facet', 'flat + face'],
  ['fable', 'beast + story'],
  ['malice', 'bad + intent'],
  ['naked', 'bare + body'],
  ['valor', 'brave + nature'],
  ['poverty', 'poor + state'],
  ['pilgrimage', 'holy + journey'],
  ['phoenix', 'fire + bird'],
  // Greek zoidiakos, the circle of little animals. The constellations
  // along the sun's path are mostly beasts, and the word says so.
  ['zodiac', 'beast + circle'],
  ['terrace', 'flat + step + land'],
  ['thicket', 'thick + tree + group'],
  ['titan', 'giant + god'],
  ['totem', 'kin + sign'],
  ['nymph', 'water + spirit'],
  ['wraith', 'dead + spirit'],
  ['augury', 'sign + read'],
  ['divination', 'hidden + know + act'],
]

// ─── Build ──────────────────────────────────────────────

type Row = { term: string; parts: string; how: string }

const found = new Map<string, Row>()

for (const [term, parts] of SENSE) {
  if (!parts) continue
  found.set(term, { term, parts, how: 'sense' })
}

for (const word of GRAMMAR) {
  if (!found.has(word)) {
    found.set(word, { term: word, parts: 'grammar', how: 'grammar' })
  }
}

/**
 * A clipping only counts when its long form is in the pool, so the file
 * never claims two words are the same one without both being here.
 */
for (const [short, long] of CLIPPING) {
  if (!known.has(short)) continue
  if (found.has(short)) continue
  found.set(short, { term: short, parts: long, how: 'clipping' })
}

for (const word of words) {
  if (found.has(word)) continue
  const hit = byPrefix(word) ?? byCompound(word) ?? byAffix(word)
  if (hit) {
    found.set(word, { term: word, parts: hit.parts, how: hit.how })
  }
}

const out = [...found.values()].sort((a, b) => {
  if (a.how !== b.how) return a.how.localeCompare(b.how)
  return a.term.localeCompare(b.term)
})

const csv = ['term,parts,how']
for (const row of out) {
  csv.push(`${row.term},${row.parts},${row.how}`)
}
writeFileSync(
  resolve(TERM, 'derivable.english.csv'),
  `${csv.join('\n')}\n`,
)

const wideTerm = Math.max(4, ...out.map(r => r.term.length))
const wideParts = Math.max(5, ...out.map(r => r.parts.length))
const txt = [
  `${'term'.padEnd(wideTerm)}  ${'parts'.padEnd(wideParts)}  how`,
  `${'-'.repeat(wideTerm)}  ${'-'.repeat(wideParts)}  --------`,
]
for (const row of out) {
  txt.push(
    `${row.term.padEnd(wideTerm)}  ${row.parts.padEnd(wideParts)}  ${row.how}`,
  )
}
writeFileSync(
  resolve(TERM, 'derivable.english.txt'),
  `${txt.join('\n')}\n`,
)

// ─── Report ─────────────────────────────────────────────

const byHow = new Map<string, number>()
for (const row of out) {
  byHow.set(row.how, (byHow.get(row.how) ?? 0) + 1)
}

console.log('| how | count |')
console.log('| :--- | ---: |')
for (const [how, count] of [...byHow.entries()].sort(
  (a, b) => b[1] - a[1],
)) {
  console.log(`| ${how} | ${count} |`)
}
console.log('')
console.log(
  `${out.length} of ${words.length} candidates come apart. ${words.length - out.length} look irreducible.`,
)

const onList = out.filter(r => known.has(r.term)).length
console.log(
  `${onList} of them are still ON the candidate list and should come off.`,
)
console.log('')

/**
 * Every part used to build something has to be a candidate itself.
 *
 * **This is the check that answers "what base concepts are missing"
 * mechanically rather than by intuition.** A decomposition that leans on
 * a word the lexicon does not have is not a decomposition, it is a debt.
 * If `zebra` is a stripe horse then `stripe` needs a root, and if it has
 * none then the breakdown cannot actually be said.
 *
 * So the missing parts ARE the missing base concepts, and they are found
 * by reading the breakdowns rather than by guessing at categories.
 */
const KINDS = new Set([
  'act',
  'agent',
  'ability',
  'like',
  'manner',
  'nature',
  'practice',
  'process',
  'state',
  'target',
  'full',
  'without',
  'person',
  'thing',
])

const owed = new Map<string, Array<string>>()
for (const row of out) {
  // A clipping's `parts` is the long form of the same word, and a
  // grammar row has no parts at all. Neither is a breakdown into roots,
  // so neither owes the lexicon anything.
  if (row.how === 'clipping' || row.how === 'grammar') continue
  for (const part of row.parts.split('+').map(p => p.trim())) {
    if (!part || KINDS.has(part) || known.has(part)) continue
    const who = owed.get(part) ?? []
    who.push(row.term)
    owed.set(part, who)
  }
}

/**
 * How many things each part is used to build.
 *
 * **This is information, not a filter, and the difference matters.**
 *
 *   many words still need to be base even if they can't be built upon
 *
 * `whale` heads one breakdown. `gratitude` heads none. Both are base
 * words, because a root earns its place by being irreducible, and
 * building things is a reason to KEEP a word rather than a test it has
 * to pass. An earlier version of this project cut `destiny` and
 * `empathy` for scoring zero on exactly this kind of count.
 *
 * What the number is good for: noticing a basis member that is carrying
 * almost nothing, like `crane` heading only `heron` and `stork`, and
 * asking whether those two would read better off `bird` directly. That
 * is a question to consider, never an answer.
 */
const heads = new Map<string, number>()
for (const row of out) {
  for (const part of row.parts.split('+').map(p => p.trim())) {
    if (!part || KINDS.has(part)) continue
    heads.set(part, (heads.get(part) ?? 0) + 1)
  }
}

console.log('PARTS THAT BUILD THE MOST')
console.log('')
for (const [part, count] of [...heads.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)) {
  console.log(`  ${String(count).padStart(4)}  ${part}`)
}
console.log('')
const thin = [...heads.entries()].filter(([, n]) => n === 1).length
console.log(
  `  ${thin} parts build exactly one thing. Worth a look, NOT a cut:`,
)
console.log(
  '  a word can be irreducible and still build nothing, and most are.',
)
console.log('')

if (owed.size === 0) {
  console.log('Every part of every breakdown is already a candidate.')
} else {
  console.log(
    `MISSING BASE CONCEPTS: ${owed.size} parts are used to build things and have no root.`,
  )
  console.log('')
  for (const [part, who] of [...owed.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  )) {
    console.log(`  ${part.padEnd(14)} needed by ${who.slice(0, 6).join(', ')}`)
  }
}
console.log('')
console.log(`wrote ${resolve(TERM, 'derivable.english.csv')}`)
console.log(`wrote ${resolve(TERM, 'derivable.english.txt')}`)
