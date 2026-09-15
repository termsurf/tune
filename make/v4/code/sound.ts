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
 * The clusters v4 may open on, exactly as `4.ts` listed them.
 */
export const ONSET_CLUSTERS = (
  'br bl dr fr fl gr gl kr kl pr pl tr vr sk sp st sl sm sn tx'
).split(' ')

/**
 * The clusters v4 may close on, exactly as `4.ts` listed them.
 */
export const CODA_CLUSTERS = (
  'mp nt nd qk lp lb lf lv ls lx lz lt lc ld lk rp rb rf rv rs rz rt ' +
  'rd rk rg rx ft ps px ks kx bz gz ts dj dz sk sp st xt'
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

export function holdsHush(cluster: string): boolean {
  return [...cluster].some(sound => HUSHES.includes(sound))
}

export const ONSET_CLUSTERS_CLEAR = ONSET_CLUSTERS.filter(c => !holdsHush(c))
export const CODA_CLUSTERS_CLEAR = CODA_CLUSTERS.filter(c => !holdsHush(c))

// ─── Rules ──────────────────────────────────────────────

/** Sounds too weak to open a word. */
export const BAD_OPEN = ['q', 'w', 'y']

/** Sounds too weak to close a word. */
export const BAD_CLOSE = ['h', 'w', 'y']

/** A glide v4 does not say at all. */
export const BAD_ANYWHERE = ['w']

/**
 * A close front vowel followed by a liquid blurs into the liquid, so
 * `bil` cannot be held apart from `bi`.
 */
export const BAD_RHYME = ['il', 'el', 'ir', 'er']

export type WordRule = {
  name: string
  note: string
  test: (word: string) => boolean
}

export const WORD_RULES: Array<WordRule> = [
  {
    name: 'no_weak_open',
    note: 'a word never starts with q, w or y',
    test: word => !BAD_OPEN.includes(word[0]),
  },
  {
    name: 'no_weak_close',
    note: 'a word never ends in h, w or y',
    test: word => !BAD_CLOSE.includes(word[word.length - 1]),
  },
  {
    name: 'no_lost_glide',
    note: 'w is said nowhere in v4',
    test: word => ![...word].some(sound => BAD_ANYWHERE.includes(sound)),
  },
  {
    name: 'no_blurred_rhyme',
    note: 'il, el, ir and er never stand next to each other',
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

export function testWord(word: string): { ok: boolean; broke: Array<string> } {
  const shape = toShape(word)
  if (shape === null || !SHAPES.includes(shape as Shape)) {
    return { ok: false, broke: ['bad_shape'] }
  }
  const broke = WORD_RULES.filter(rule => !rule.test(word)).map(r => r.name)
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
export const ADJACENT_VOWELS = new Set('ie ei ea ae ao oa ou uo'.split(' '))

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
      shapeA[i] === 'V' ? vowelsClose(a[i], b[i]) : areSimilar(a[i], b[i])
    if (!near) {
      return false
    }
  }
  return true
}

// ─── Sort Order ─────────────────────────────────────────

export const SOUND_ORDER =
  'i e a o u m n q b d g p t k h s z f v x j c C w l r y'.split(' ')

export const SOUND_RANK = new Map(SOUND_ORDER.map((sound, i) => [sound, i]))

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
