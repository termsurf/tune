/**
 * Whether a word's SOUNDS agree with its SENSE.
 *
 * This is the second half of the ordering rule, and for most of the
 * lexicon it is the only half that applies. `ceiling` measured it: of 93
 * base words still wanting a three-letter form, **76 have no strong
 * English echo anywhere in the CVC inventory**, taken or free.
 * `orientation`, `unpredictable`, `intersection` and `continuous` cannot
 * be made to sound like themselves in three sounds. For those the vibe
 * is the whole of the answer.
 *
 * ## What it is not
 *
 * **Not "similar meanings get similar sounds", which is wrong.** `yes`
 * and `no` should be maximally distinguishable precisely because their
 * meanings are confusable. That is the `spread` term's job. This asks
 * only whether ONE word agrees with ITS OWN sense.
 *
 * ## How it works
 *
 * Every sound carries a reading in `base/v4/system/sound.md`. Those
 * readings are turned into a vector over seven axes, a concept is tagged
 * on the same axes from its gloss, and the score is how far the two
 * agree on the axes the concept actually has an opinion about.
 *
 * ## What is approximate here, said plainly
 *
 * The concept tagging is keyword matching on an English gloss. It is a
 * BOOTSTRAP, and `note/tune/pipeline/score.md` says the real version is
 * a model tagging the concepts in bulk and a person spot-checking. This
 * exists so the term is wired, measurable and arguable now rather than
 * waiting. Where a concept matches no keyword it scores neutral and
 * contributes nothing, which is the honest answer rather than a guess.
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

import { isVowel } from '../sound'
import { TERM } from './board'

// ─── The axes ───────────────────────────────────────────

export const AXES = [
  'polarity',
  'height',
  'depth',
  'heat',
  'motion',
  'mind',
  'bond',
] as const

export type Axis = (typeof AXES)[number]
export type Vec = Record<Axis, number>

function vec(partial: Partial<Vec>): Vec {
  return {
    polarity: 0,
    height: 0,
    depth: 0,
    heat: 0,
    motion: 0,
    mind: 0,
    bond: 0,
    ...partial,
  }
}

// ─── The sounds ─────────────────────────────────────────

/**
 * Straight from `system/sound.md`, one entry per sound.
 *
 *   the vowels    height, depth, heat, read off the cross
 *   m n q         positive, negative, and the ongoing hum
 *   g d b         creation impulse, formation, manifestation
 *   p t k         abstract, logic, execution
 *   h             breath, the pivot
 *   s z v f       rest, ground, energy, flow
 *   x j c C       awareness, shaping, thinking, relation
 *   w l r y       the feet, action in the world
 */
export const SOUND_VIBE: Record<string, Vec> = {
  // The head. `a` is the centre and says nothing, which is the point.
  i: vec({ height: 1, depth: 1, heat: 1 }),
  e: vec({ height: 0.4, depth: 0.4 }),
  a: vec({}),
  o: vec({ height: -0.2, depth: -0.2, bond: 0.4 }),
  u: vec({ height: -1, depth: -1, heat: -1 }),

  // The torso: orientation.
  m: vec({ polarity: 1, bond: 0.8 }),
  n: vec({ polarity: -1, bond: -0.8 }),
  q: vec({ motion: 0.3, bond: 0.5 }),

  // The torso: creation becoming real.
  g: vec({ motion: 0.6, mind: -0.2 }),
  d: vec({ motion: 0.3, mind: 0.2 }),
  b: vec({ motion: 0.5, depth: 0.4 }),

  // The torso: the abstract made real.
  p: vec({ mind: 0.8 }),
  t: vec({ mind: 0.6, motion: 0.2 }),
  k: vec({ mind: -0.6, motion: 0.5 }),

  // The waist.
  h: vec({ motion: 0.2, depth: 0.2 }),

  // The legs: the snake.
  s: vec({ motion: -0.8 }),
  z: vec({ motion: -0.6, height: -0.4 }),
  v: vec({ motion: 0.7 }),
  f: vec({ motion: 0.8, depth: 0.3 }),
  x: vec({ mind: 0.5, motion: -0.4 }),
  j: vec({ mind: 0.4, depth: -0.4 }),
  c: vec({ mind: 0.9 }),
  C: vec({ bond: 1, mind: 0.3 }),

  // The feet: action in the world.
  w: vec({ motion: 0.5 }),
  l: vec({ motion: 0.4, bond: 0.3 }),
  r: vec({ motion: 0.6 }),
  y: vec({ height: 0.4, motion: 0.3 }),
}

/**
 * A word's vibe.
 *
 * **The vowel counts for more than a single consonant**, because the
 * vowel is the one sound the whole word is built around and
 * `system/sound.md` reads the sets off it. The consonants are averaged
 * so a four-letter word is not louder than a three-letter one.
 */
/**
 * Axes where the word describes a MOVEMENT between two states, so the
 * opening and the closing are a from and a to rather than two votes.
 *
 * On these, the consonants are read as a TRAJECTORY. `kaz` and `zak`
 * hold the same sounds and trace opposite paths, which is why they are
 * opposites, and averaging them made them identical.
 */
const DIRECTIONAL: Array<Axis> = ['height', 'depth', 'heat', 'motion']

/**
 * Axes where the word says what KIND of thing it is.
 *
 * `philosophy.md` principle 15: the last word says what kind of thing
 * the phrase is. The same holds inside a word, so the closing consonant
 * is weighted above the opening one rather than equal to it.
 */
const CLASSIFYING: Array<Axis> = ['polarity', 'mind', 'bond']

/** Where the vowel sits, so the two consonant groups can be told apart. */
function splitWord(word: string): {
  onset: Array<string>
  vowel: string
  coda: Array<string>
} {
  const sounds = word.split('')
  const at = sounds.findIndex(isVowel)
  if (at < 0) {
    return { onset: sounds, vowel: '', coda: [] }
  }
  return {
    onset: sounds.slice(0, at),
    vowel: sounds[at],
    coda: sounds.slice(at + 1),
  }
}

function meanReading(sounds: Array<string>, axis: Axis): number {
  const known = sounds.filter(s => SOUND_VIBE[s])
  if (known.length === 0) return 0
  let sum = 0
  for (const sound of known) {
    sum += readingOf(sound, axis)
  }
  return sum / known.length
}

/**
 * A word's vibe, read IN ORDER.
 *
 * The first version summed every sound and divided, which gave `bic` and
 * `cib` the same vector, and `kaz` and `zak` the same vector. **Order is
 * most of the content**: the reversal pairs in `base.csv` are opposites
 * precisely because the sounds run the other way, so a measure blind to
 * order cannot represent opposition at all.
 *
 * Position is not a guess. `v4:pipe claim` tests the openings and the
 * closings separately and they disagree, with sign flips at real
 * samples: `n` separates at the start (-0.45) and connects at the end
 * (+0.73); `t` reads mental at the start and physical at the end, which
 * is the whole of why it looked BACKWARDS when read anywhere.
 */
export function wordVibe(word: string): Vec {
  const { onset, vowel, coda } = splitWord(word)
  const out = vec({})

  for (const axis of DIRECTIONAL) {
    // Where it ends minus where it began, plus what the vowel itself
    // says, since the vowel is a state rather than a step.
    const from = meanReading(onset, axis)
    const to = meanReading(coda, axis)
    const move = (to - from) / 2
    const held = vowel ? readingOf(vowel, axis) : 0
    out[axis] = Math.max(-1, Math.min(1, move * 0.55 + held * 0.75))
  }

  for (const axis of CLASSIFYING) {
    const from = meanReading(onset, axis)
    const to = meanReading(coda, axis)
    const held = vowel ? readingOf(vowel, axis) : 0
    // The closing carries the kind, so it outweighs the opening.
    out[axis] = Math.max(
      -1,
      Math.min(1, (from * 0.3 + held * 0.25 + to * 0.55) / 0.75),
    )
  }

  return out
}

// ─── The concepts ───────────────────────────────────────

/**
 * Words that place a concept on an axis.
 *
 * Deliberately short lists of unambiguous words. A longer list matches
 * more concepts and matches them worse, and a wrong tag is worse than no
 * tag, because it penalises a word for disagreeing with something the
 * concept never said.
 */
const CUE: Array<[Axis, number, Array<string>]> = [
  [
    'polarity',
    1,
    `good love joy pleasure peace kind gift give help heal safe true right yes
     beauty hope warm friend gain rich whole bless happy well nice fine best
     better glad delight comfort care protect save win succeed reward praise
     honor worth value grace mercy gentle sweet pure clean holy divine favor
     trust faith enjoy thrive prosper flourish благ`.split(/\s+/),
  ],
  [
    'polarity',
    -1,
    `bad pain hate evil harm hurt fear death kill loss poor wrong false lack
     empty sick grief anger cruel waste worse worst ugly dirty foul rot
     disease suffer fail lose defeat punish blame shame guilt curse harsh
     bitter sour poison danger threat enemy war destroy break ruin attack
     wound sorrow misery dread panic`.split(/\s+/),
  ],
  [
    'height',
    1,
    `up above high top rise sky over climb peak upper ascend tall lift raise
     crown head heaven mountain soar summit above overhead upward crest`.split(/\s+/),
  ],
  [
    'height',
    -1,
    `down below low bottom fall under beneath sink drop lower descend short
     ground floor foot root bury cellar pit valley downward underneath base`.split(/\s+/),
  ],
  [
    'depth',
    1,
    `out outer outside external surface open expose reveal show public skin
     shell face edge border exterior visible obvious apparent outward emit
     export broadcast display`.split(/\s+/),
  ],
  [
    'depth',
    -1,
    `in inner inside internal deep hidden secret core within private heart
     soul gut marrow interior invisible subtle conceal bury inward import
     absorb swallow`.split(/\s+/),
  ],
  [
    'heat',
    1,
    `hot heat fire burn sun bright light flame warm glow blaze scorch summer
     spark shine day noon flare ember radiant`.split(/\s+/),
  ],
  [
    'heat',
    -1,
    `cold cool ice freeze dark night moon shade dim black winter frost chill
     shadow gloom dusk midnight frozen`.split(/\s+/),
  ],
  [
    'motion',
    1,
    `move go run flow change fast travel turn shift flux act do work drive
     push pull walk step jump fly swim throw send carry begin start grow
     become dance spin roll rush chase leap slide swing wave stream pour`.split(/\s+/),
  ],
  [
    'motion',
    -1,
    `still rest stop stay calm quiet sleep pause hold fix static remain sit
     stand wait keep endure persist stable constant permanent settle freeze
     halt anchor sleep silent motionless`.split(/\s+/),
  ],
  [
    'mind',
    1,
    `think thought mind idea know reason logic learn abstract concept meaning
     believe imagine understand remember wisdom knowledge theory model plan
     intend dream conscious aware judge doubt guess infer perceive notion
     memory symbol sign語`.split(/\s+/),
  ],
  [
    'mind',
    -1,
    `body physical matter rock stone flesh earth hand tool object thing
     material metal wood water dirt bone blood skin food tree animal mud
     soil sand iron stick leaf fruit meat`.split(/\s+/),
  ],
  [
    'bond',
    1,
    `join together bond link connect with relation family group share unite
     whole among between friend marry couple pair team gather collect merge
     bind attach include belong meet touch mix weave net web tie knot both`.split(/\s+/),
  ],
  [
    'bond',
    -1,
    `apart alone separate split cut break divide away without single isolate
     other alien strange lone exclude remove reject leave part sever detach
     scatter lose abandon solitary each only`.split(/\s+/),
  ],
]

/**
 * A crude stem, so `moving` matches `move` and `connection` matches
 * `connect`.
 *
 * Deliberately shallow. A real stemmer would match more and match worse,
 * and a wrong tag costs more than a missing one here: it penalises a
 * word for disagreeing with something its concept never said.
 */
function stem(word: string): Array<string> {
  const out = new Set<string>([word])
  for (const suffix of [
    'ing',
    'ed',
    'es',
    's',
    'ion',
    'tion',
    'ness',
    'ity',
    'ly',
    'er',
    'est',
    'al',
    'ful',
    'less',
  ]) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      const cut = word.slice(0, -suffix.length)
      out.add(cut)
      out.add(`${cut}e`)
    }
  }
  return [...out]
}

const CUE_AT = new Map<string, Array<[Axis, number]>>()
for (const [axis, sign, cues] of CUE) {
  for (const cue of cues) {
    const key = cue.trim().toLowerCase()
    if (!key) continue
    const list = CUE_AT.get(key) ?? []
    list.push([axis, sign])
    CUE_AT.set(key, list)
  }
}

/**
 * A concept's vibe, from the words of its gloss.
 *
 * Returns which axes it actually has an opinion about, so the score can
 * ignore the rest instead of treating silence as zero.
 */
/**
 * Tags written by hand, which beat anything inferred from the gloss.
 *
 * `base/v4/term/tag.csv` is one row per concept with a value on each
 * axis it has an opinion about and a blank everywhere else. **A blank is
 * not a zero**, it is "this concept does not speak to that axis", which
 * is the distinction the whole term depends on.
 *
 * Keyword matching stays as the fallback for untagged concepts, and it
 * is a fallback rather than the design: it failed its control, and
 * `note/tune/pipeline/found.md` has the numbers.
 */
let TAGS: Map<string, { want: Vec; said: Set<Axis> }> | null = null

function readTags(): Map<string, { want: Vec; said: Set<Axis> }> {
  if (TAGS) return TAGS
  TAGS = new Map()
  const file = resolve(TERM, 'tag.csv')
  if (!existsSync(file)) return TAGS
  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    const meaning = (row.meaning ?? '').trim()
    if (!meaning) continue
    const want = vec({})
    const said = new Set<Axis>()
    for (const axis of AXES) {
      const cell = (row[axis] ?? '').trim()
      if (cell === '') continue
      const value = Number(cell)
      if (!Number.isFinite(value)) continue
      want[axis] = Math.max(-1, Math.min(1, value))
      said.add(axis)
    }
    if (said.size > 0) {
      TAGS.set(meaning.toLowerCase(), { want, said })
    }
  }
  return TAGS
}

export function conceptVibe(meaning: string): {
  want: Vec
  said: Set<Axis>
} {
  const tagged = readTags().get(meaning.trim().toLowerCase())
  if (tagged) {
    return tagged
  }
  const want = vec({})
  const said = new Set<Axis>()
  const words = meaning
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  for (const word of words) {
    for (const form of stem(word)) {
      const hits = CUE_AT.get(form)
      if (!hits) continue
      for (const [axis, sign] of hits) {
        want[axis] += sign
        said.add(axis)
      }
      break
    }
  }
  for (const axis of said) {
    want[axis] = Math.max(-1, Math.min(1, want[axis]))
  }
  return { want, said }
}

// ─── The score ──────────────────────────────────────────

/**
 * How badly a word's sounds disagree with its sense, from 0 to 1.
 *
 * Only the axes the concept spoke about are read. A concept with nothing
 * to say scores 0, which means "no evidence" and not "perfect".
 */
/**
 * Restricts the readings to the ones a caller has verified.
 *
 * `claim.ts` fits this on half the lexicon and the other half is what
 * proves it. Passing nothing means every reading is used, which is the
 * unverified behaviour and is what failed its control.
 */
let held: Set<string> | null = null

export function useReadings(keep: Set<string> | null): void {
  held = keep
}

function readingOf(sound: string, axis: Axis): number {
  const from = SOUND_VIBE[sound]
  if (!from) return 0
  if (held && !held.has(`${sound}|${axis}`)) return 0
  return from[axis]
}

export function vibeLoss(word: string, meaning: string): number {
  const { want, said } = conceptVibe(meaning)
  if (said.size === 0) {
    return 0
  }
  const has = wordVibe(word)
  let off = 0
  for (const axis of said) {
    // The word's axis runs roughly -1..1 already; disagreement in SIGN
    // is what matters, and magnitude beyond that is not evidence.
    const mine = Math.max(-1, Math.min(1, has[axis] * 2.2))
    off += Math.abs(want[axis] - mine) / 2
  }
  return off / said.size
}

/** Whether a concept says anything this term can read. */
export function speaks(meaning: string): boolean {
  return conceptVibe(meaning).said.size > 0
}
