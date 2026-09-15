/**
 * Tune v4 sounds, shapes and rules.
 *
 * v4 is one syllable, and a cluster may stand on one side of the vowel
 * or the other, never both. Three shapes, and no more.
 *
 *   CVC    bat
 *   CVCC   bant
 *   CCVC   brat
 *
 * Everything here is carried over from v3. `make/v3/talk/code/3.ts`
 * built `CVC` and `make/v3/talk/code/4.ts` built `CVCC` and `CCVC`,
 * and the two files stated their rules separately. Where they differed
 * this file takes the union, because one language cannot let a sound
 * open a three letter word and refuse it in a four letter one.
 *
 *   3.ts refused q, w and y at the start. 4.ts said nothing about the
 *   start, so `qant` and `yant` passed there. v4 refuses them.
 *
 *   3.ts checked the bad rhyme only against the tail, which for a three
 *   letter word is the whole of it. 4.ts checked every neighbouring
 *   pair. v4 checks every pair, which is the same test on `CVC`.
 *
 *   4.ts refused w anywhere. On `CVC` that is already implied by the
 *   start and end rules, so nothing moved.
 */

import { SORT_ORDER } from '../../../code/phonology'

// ─── Inventory ──────────────────────────────────────────

export const VOWELS = 'ieaou'.split('')

export const CONSONANTS = 'mnqgdbptkhsfvzjxcCwlry'.split('')

export const SOUNDS = [...VOWELS, ...CONSONANTS]

export function isVowel(sound: string): boolean {
  return VOWELS.includes(sound)
}

export function isConsonant(sound: string): boolean {
  return CONSONANTS.includes(sound)
}

/** `bat` becomes `CVC`, `brat` becomes `CCVC`. */
export function toShape(word: string): string | null {
  let shape = ''
  for (const sound of word) {
    if (isVowel(sound)) {
      shape += 'V'
    } else if (isConsonant(sound)) {
      shape += 'C'
    } else {
      return null
    }
  }
  return shape
}

// ─── Shapes ─────────────────────────────────────────────

export const SHAPES = ['CVC', 'CVCC', 'CCVC'] as const

export type Shape = (typeof SHAPES)[number]

// ─── Clusters ───────────────────────────────────────────

/**
 * The clusters v4 may open on.
 *
 * `4.ts` listed twenty of these. **`dj` is the twenty first**, and it
 * belongs for the same reason `tx` does: the two are digraphs standing
 * for one sound each, not clusters, so whatever one may do the other
 * may do. v3 already let `dj` close a word while `tx` both opened and
 * closed, which was an asymmetry between two sounds that are a matched
 * voiced and voiceless pair.
 */
export const ONSET_CLUSTERS =
  'br bl dr fr fl gr gl kr kl pr pl tr vr sk sp st sl sm sn tx dj'.split(
    ' ',
  )

/**
 * The clusters v4 may close on.
 *
 * `4.ts` listed these without `tx`, which left the two digraphs
 * lopsided: `dj` could both open and close a word while `tx` could only
 * open one, so `dj` turned up about twice as often as its voiceless
 * twin. They stand for one sound each and are a matched pair, so
 * whatever one may do the other may do.
 *
 * `tx` closing a word is `watch`, which is not an exotic thing to ask
 * of a mouth. Note it is not `xt`, already on the list and the other
 * way round.
 */
export const CODA_CLUSTERS = (
  'mp nt nd qk lp lb lf lv ls lx lz lt lc ld lk rp rb rf rv rs rz rt ' +
  'rd rk rg rx ft ps px ks kx bz gz ts dj tx dz sk sp st xt'
).split(' ')

/**
 * `4.ts` listed a cluster and then refused it again if it held a hush.
 * Both halves are kept so the arithmetic can say what each one cost.
 *
 * It takes `tx` out of the openings and `lx rx px kx dj xt` out of the
 * closings, so six of the forty closings and one of the twenty openings
 * never reach a word.
 */
export const HUSHES = ['x', 'j']

/**
 * `tx` and `dj` are two letters standing for ONE sound each, so they
 * are not clusters at all and the hush rule does not reach them.
 *
 * v3's `4.ts` refused every cluster holding `x` or `j` and took these
 * two with it. `make/v3/talk/code/sound.ts` had already caught that and
 * written it down: they "are the most common clusters in the language
 * by a wide margin, and they are digraphs for single sounds rather than
 * clusters at all, which is why they were being handled separately".
 * v4 agrees with the note rather than with the code it annotates.
 */
export const DIGRAPHS = ['tx', 'dj']

export function holdsHush(cluster: string): boolean {
  if (DIGRAPHS.includes(cluster)) {
    return false
  }
  return [...cluster].some(sound => HUSHES.includes(sound))
}

export const ONSET_CLUSTERS_CLEAR = ONSET_CLUSTERS.filter(
  c => !holdsHush(c),
)
export const CODA_CLUSTERS_CLEAR = CODA_CLUSTERS.filter(
  c => !holdsHush(c),
)

// ─── Rules ──────────────────────────────────────────────

/**
 * Sounds too weak to open a word.
 *
 * `q` alone, which is what the Tune readme has always said. v3's
 * `3.ts` also refused `w` and `y` here and `4.ts` refused `w`
 * everywhere, and between them those two left `w` and `y` with nowhere
 * to go: they could not open, could not close, and stand in no cluster,
 * so neither sound appeared in a single word.
 *
 * **Every one of the 22 consonants has to reach a word.** A sound the
 * inventory claims and the lexicon never uses is not part of the
 * language. So the glides open words again, `wat` and `yat`, and the
 * extra bans are gone.
 */
export const BAD_OPEN = ['q']

/** Sounds too weak to close a word. */
export const BAD_CLOSE = ['h', 'w', 'y']

/** Nothing is refused outright. Every sound has somewhere to stand. */
export const BAD_ANYWHERE: Array<string> = []

/**
 * A vowel followed by a liquid blurs into the liquid, so `bil` cannot
 * be held apart from `bi`.
 *
 * v3 named the two front vowels, and only they blur. `u` was added here
 * on an argument about tongue gesture and taken back out on 2026-09-15:
 * `bul` and `bur` are held apart from `bu` fine, and the ban cost 252
 * words including `tul`, `gul` and `jul`, which were wanted.
 *
 * So the rule is about the FRONT vowels. `a`, `o` and `u` may all close
 * on a liquid.
 */
export const BAD_RHYME = ['il', 'el', 'ir', 'er']

/**
 * Forms v4 will not use, whatever the rules allow.
 *
 * A generated language has no idea what it is saying in anybody else's,
 * and the shapes here land on English slurs and profanity often enough
 * that it has to be checked rather than hoped about. Every form below
 * was produced by the rules and then taken out by hand.
 *
 * **The screen is on the SOUND, not the spelling.** `x` is the *sh* of
 * `ship` here, so `xit` is not an odd looking string, it is the word
 * said aloud. `j` is the *zh* of `beige`, so `jiz` is likewise. Reading
 * this list without the sound table makes half of it look arbitrary.
 *
 * Two kinds are in it and they are not the same kind of thing. The
 * slurs are the ones that matter, because a word for something ordinary
 * that sounds like a slur is a wound the speaker did not choose. The
 * profanity is a smaller matter and is here because a language that
 * makes a reader snort is a language nobody uses for serious work.
 *
 * This is a starting list, not a finished one. It covers English only,
 * and v4 will need the same pass for every language it means to be
 * spoken beside.
 */

/**
 * The slurs, written out.
 *
 * `nik` and `nek` are on the list because `g` and `k` differ by voicing
 * alone and the ear does not hold them apart reliably. They are named
 * rather than derived.
 *
 * An earlier version swept the whole neighbourhood of each of these,
 * every form with similar consonants and a close vowel, which came to
 * 353 refused forms and took `mag`, `nag`, `mok` and two dozen other
 * innocent words with it. **The cost was not worth it.** A list a
 * person can read and argue with beats a rule that quietly eats a
 * tenth of the language. Add a form here when one turns up.
 */
export const TABOO_SLUR = (
  /** the three letter forms */
  'nig neg nug nik nek kuk guk fag jap djap wop spik spaz tard gimp krip xik ' +
  /** and the same four closed on a sibilant, which is the plural */
  'nigz negz niks neks ' +
  /** opening on the s cluster */
  'snig sneg'
).split(' ')

/**
 * Profanity, refused as written.
 *
 * **Almost nothing is on this list, and that is the decision.** An
 * earlier version carried two dozen forms, `kum` `puk` `krap` `bast`
 * `dam` `slut` `hor` `xit` `pis` `tit` `dik` `kok` and the rest, and
 * every one of them cost a real word to head off a snigger that was
 * never coming. A Tune word is read as a Tune word.
 *
 * The slurs stay because a speaker saying an ordinary thing and being
 * heard to say a slur is a harm they did not choose. Crudity is not
 * that, so the bar is set where the English reading is the only one a
 * speaker could land on.
 */
export const TABOO_CRUDE = 'fak put'.split(' ')

/** Every form v4 refuses outright. */
export const TABOO = [...TABOO_SLUR, ...TABOO_CRUDE]

const TABOO_SET = new Set(TABOO)

export function isTaboo(word: string): boolean {
  return TABOO_SET.has(word)
}

export type WordRule = {
  name: string
  note: string
  test: (word: string) => boolean
}

export const WORD_RULES: Array<WordRule> = [
  {
    name: 'no_weak_open',
    note: 'a word never starts with q',
    test: word => !BAD_OPEN.includes(word[0]),
  },
  {
    name: 'no_weak_close',
    note: 'a word never ends in h, w or y',
    test: word => !BAD_CLOSE.includes(word[word.length - 1]),
  },
  {
    name: 'no_lost_sound',
    note: 'nothing is refused outright, so every consonant reaches a word',
    test: word =>
      ![...word].some(sound => BAD_ANYWHERE.includes(sound)),
  },
  {
    name: 'no_blurred_rhyme',
    note: 'a liquid closes only on a or o, so il el ir er ul ur never stand',
    test: word => {
      for (let i = 0; i < word.length - 1; i++) {
        if (BAD_RHYME.includes(word.slice(i, i + 2))) {
          return false
        }
      }
      return true
    },
  },
  {
    name: 'known_onset',
    note: 'a word opening on two sounds opens on a listed cluster',
    test: word => {
      if (toShape(word) !== 'CCVC') {
        return true
      }
      return ONSET_CLUSTERS.includes(word.slice(0, 2))
    },
  },
  {
    name: 'known_coda',
    note: 'a word closing on two sounds closes on a listed cluster',
    test: word => {
      if (toShape(word) !== 'CVCC') {
        return true
      }
      return CODA_CLUSTERS.includes(word.slice(2))
    },
  },
  {
    name: 'no_taboo',
    note: 'a form that reads as a slur or as profanity is not a word',
    test: word => !isTaboo(word),
  },
  {
    name: 'no_hush_in_cluster',
    note: 'x and j never stand inside a cluster',
    test: word => {
      const shape = toShape(word)
      if (shape === 'CCVC') {
        return !holdsHush(word.slice(0, 2))
      }
      if (shape === 'CVCC') {
        return !holdsHush(word.slice(2))
      }
      return true
    },
  },
]

export function testWord(word: string): {
  ok: boolean
  broke: Array<string>
} {
  const shape = toShape(word)
  if (shape === null || !SHAPES.includes(shape as Shape)) {
    return { ok: false, broke: ['bad_shape'] }
  }
  const broke = WORD_RULES.filter(rule => !rule.test(word)).map(
    r => r.name,
  )
  return { ok: broke.length === 0, broke }
}

// ─── Closeness ──────────────────────────────────────────

/**
 * Consonants near enough that swapping one for the other says nothing
 * new. Carried over unchanged from `3.ts` and `4.ts`, which held the
 * same seventeen groups.
 */
export const SIMILAR_GROUPS: Array<Array<string>> = [
  ['m', 'n', 'q'],
  ['b', 'p'],
  ['d', 't'],
  ['b', 'd'],
  ['p', 't'],
  ['g', 'k'],
  ['s', 'z'],
  ['x', 'j'],
  ['c', 'C'],
  ['f', 'v'],
  ['s', 'c'],
  ['z', 'C'],
  ['j', 'C'],
  ['x', 'c'],
  ['f', 'c'],
  ['C', 'v'],
  ['l', 'r'],
]

/** Vowels sitting next to each other on the ladder `i e a o u`. */
export const ADJACENT_VOWELS = new Set(
  'ie ei ea ae ao oa ou uo'.split(' '),
)

const similarTo = new Map<string, Set<string>>()
for (const sound of CONSONANTS) {
  similarTo.set(sound, new Set([sound]))
}
for (const group of SIMILAR_GROUPS) {
  for (const a of group) {
    for (const b of group) {
      similarTo.get(a)?.add(b)
    }
  }
}

export function areSimilar(a: string, b: string): boolean {
  return similarTo.get(a)?.has(b) ?? false
}

export function vowelsClose(a: string, b: string): boolean {
  return a === b || ADJACENT_VOWELS.has(a + b)
}

/**
 * Two words too close to be two words.
 *
 * The vowel has to be the same or one notch away, and every consonant
 * has to be similar to the consonant facing it. `bat` and `pad` go, one
 * of them. `bat` and `bas` stay, because `t` and `s` are not near.
 *
 * `3.ts` wrote this out as four cases and `4.ts` as one per shape. They
 * are the same test, because a sound is in its own similarity group, so
 * "the same" is one way of being "similar" and the four cases collapse.
 */
export function tooClose(a: string, b: string): boolean {
  if (a === b) {
    return false
  }
  const shapeA = toShape(a)
  const shapeB = toShape(b)
  if (shapeA === null || shapeA !== shapeB) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    const near =
      shapeA[i] === 'V'
        ? vowelsClose(a[i], b[i])
        : areSimilar(a[i], b[i])
    if (!near) {
      return false
    }
  }
  return true
}

// ─── Sort Order ─────────────────────────────────────────

/**
 * Every v4 file sorts by the tone order, and the tone order is the
 * package's own `code/phonology`. v4 does not keep a second copy of it,
 * because two lists of the same thing disagree eventually.
 */
export const SOUND_RANK = new Map(
  SORT_ORDER.map((sound, i) => [sound, i]),
)

export function compareWords(a: string, b: string): number {
  if (a.length !== b.length) {
    return a.length - b.length
  }
  for (let i = 0; i < a.length; i++) {
    const ra = SOUND_RANK.get(a[i]) ?? 99
    const rb = SOUND_RANK.get(b[i]) ?? 99
    if (ra !== rb) {
      return ra - rb
    }
  }
  return 0
}
