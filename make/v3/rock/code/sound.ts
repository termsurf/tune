/**
 * Tune Rock — sound system.
 *
 * Rock is the older Tune. It has 9 sounds.
 *
 *   vowels      i a u
 *   hum         m n
 *   beat        p t k
 *   breath      h
 *
 * Every syllable is CV. A root is one, two or three CV syllables. A
 * word is a root with an optional role syllable, `ha` or `hi` or `hu`.
 *
 * The breath is grammar, not vocabulary. It never appears in a root,
 * only on the role syllable, so in a chanted stream every `h` marks
 * the end of a word.
 *
 * Rock is a chant system. It gave way to Tune Talk.
 *
 * This module is the single source of truth for the inventory, the
 * rules, the sort order, the correspondence to Talk, and the reading
 * of IPA down to nine sounds.
 */

// ─── Inventory ──────────────────────────────────────────

/** The three vowels. High, level, low. */
export const VOWELS = ['i', 'a', 'u']

/** The hum. Polarity: m is good, n is bad. */
export const HUM = ['m', 'n']

/** The beat. Lips, tongue, throat. The three drum hits. */
export const BEAT = ['p', 't', 'k']

/** The breath. Carries the role, marks the end of a word. */
export const BREATH = 'h'

/** All six consonants. */
export const CONSONANTS = [...HUM, ...BEAT, BREATH]

/** All nine sounds. */
export const SOUNDS = [...VOWELS, ...CONSONANTS]

/** The five consonants a root may use. The breath is grammar. */
export const ROOT_CONSONANTS = [...HUM, ...BEAT]

// ─── Roles ──────────────────────────────────────────────

/**
 * The three roles. Rock marks a role with a whole CV syllable, because
 * a bare vowel is not something Rock can say. The breath carries it.
 *
 * The suffix is optional. In chant it usually comes off and the role
 * is left to context.
 */
export const ROLES: Array<{ name: string; syllable: string; vowel: string }> = [
  { name: 'entity', syllable: 'ha', vowel: 'a' },
  { name: 'action', syllable: 'hi', vowel: 'i' },
  { name: 'feature', syllable: 'hu', vowel: 'u' },
]

export const ROLE_SYLLABLES = ROLES.map(r => r.syllable)

// ─── Syllables ──────────────────────────────────────────

function buildSyllables(consonants: Array<string>): Array<string> {
  const list: Array<string> = []
  for (const c of consonants) {
    for (const v of VOWELS) {
      list.push(c + v)
    }
  }
  return list
}

/** 18 syllables in all. */
export const ALL_SYLLABLES = buildSyllables(CONSONANTS)

/** 15 syllables a root can be built from. */
export const ROOT_SYLLABLES = buildSyllables(ROOT_CONSONANTS)

// ─── Sort Order ─────────────────────────────────────────

/**
 * Rock sorts `i a u m n b d g p t k s z f v x j`. Rock uses that order
 * restricted to its own sounds, with the breath last, so the three
 * lexicons sort against each other without translation.
 */
export const CHAR_ORDER = 'i a u m n p t k h'.split(' ')

export const CHAR_RANK = new Map(CHAR_ORDER.map((c, i) => [c, i]))

export function compareWords(a: string, b: string): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ra = CHAR_RANK.get(a[i]) ?? 99
    const rb = CHAR_RANK.get(b[i]) ?? 99
    if (ra !== rb) {
      return ra - rb
    }
  }
  return 0
}

// ─── Shape ──────────────────────────────────────────────

export function isVowel(ch: string): boolean {
  return VOWELS.includes(ch)
}

export function isConsonant(ch: string): boolean {
  return CONSONANTS.includes(ch)
}

/** Split a CV string into its syllables. */
export function toSyllables(word: string): Array<string> {
  const parts: Array<string> = []
  for (let i = 0; i < word.length; i += 2) {
    parts.push(word.slice(i, i + 2))
  }
  return parts
}

/** True when the string alternates consonant and vowel all the way. */
export function isWellFormedCV(word: string): boolean {
  if (word.length === 0 || word.length % 2 !== 0) {
    return false
  }
  for (let i = 0; i < word.length; i += 2) {
    if (!isConsonant(word[i]) || !isVowel(word[i + 1])) {
      return false
    }
  }
  return true
}

/** Strip a trailing role syllable, if there is one. */
export function toRoot(word: string): string {
  const tail = word.slice(-2)
  if (word.length > 2 && ROLE_SYLLABLES.includes(tail)) {
    return word.slice(0, -2)
  }
  return word
}

/** The role a surface word carries, or null when it is bare. */
export function toRole(word: string): string | null {
  const tail = word.slice(-2)
  const role = ROLES.find(r => r.syllable === tail)
  return word.length > 2 && role ? role.name : null
}

// ─── Root Rules ─────────────────────────────────────────

export type RootRule = {
  name: string
  note: string
  test: (syllables: Array<string>) => boolean
}

export const ROOT_RULES: Array<RootRule> = [
  {
    name: 'breath-is-grammar',
    note: 'h never appears in a root, only on the role syllable',
    test: syllables => syllables.every(s => s[0] !== BREATH),
  },
  {
    name: 'no-triple-consonant',
    note: 'no consonant carries three syllables in a row',
    test: syllables => {
      for (let i = 0; i + 2 < syllables.length; i++) {
        if (
          syllables[i][0] === syllables[i + 1][0] &&
          syllables[i + 1][0] === syllables[i + 2][0]
        ) {
          return false
        }
      }
      return true
    },
  },
  {
    name: 'no-repeated-close-vowel',
    note: 'no i beside i and no u beside u, a beside a is fine',
    test: syllables => {
      for (let i = 0; i + 1 < syllables.length; i++) {
        const v = syllables[i][1]
        if ((v === 'i' || v === 'u') && v === syllables[i + 1][1]) {
          return false
        }
      }
      return true
    },
  },
  {
    name: 'no-opening-echo',
    note: 'the first two syllables never repeat, that shape is the intensive',
    test: syllables => syllables.length < 2 || syllables[0] !== syllables[1],
  },
]

export function testRoot(root: string): { ok: boolean; broke: Array<string> } {
  const syllables = toSyllables(root)
  const broke = ROOT_RULES.filter(rule => !rule.test(syllables)).map(r => r.name)
  return { ok: broke.length === 0, broke }
}

/** The reduplicated shape Rock reserves for the intensive. */
export function isIntensive(root: string): boolean {
  const syllables = toSyllables(root)
  return syllables.length >= 2 && syllables[0] === syllables[1]
}

// ─── Correspondence With Tune Talk ──────────────────────

/** Talk's five vowels and twenty two consonants. */
export const TALK_VOWELS = ['i', 'e', 'a', 'o', 'u']

export const TALK_CONSONANTS = [
  'm', 'n', 'q',
  'b', 'd', 'g',
  'p', 't', 'k',
  'h',
  's', 'z',
  'f', 'v',
  'x', 'j',
  'c', 'C',
  'w', 'l', 'r', 'y',
]

/**
 * What each Rock sound became in Tune Talk.
 *
 * Rock has nine sounds and Talk has twenty seven, so every Rock sound
 * fans out. The vowels split once each, the hums throw off a glide and
 * a back nasal, and the three beats carry almost the whole load: `t`
 * alone stands behind eight Talk sounds.
 *
 * The breath is the one that did not move. In Rock it is grammar
 * rather than vocabulary, carrying the role syllable and appearing in
 * no root. In Talk it is an ordinary consonant like any other, but it
 * is the same sound.
 */
export const DESCENDANTS: Record<
  string,
  Array<{ talk: string; change: string }>
> = {
  i: [
    { talk: 'i', change: 'held' },
    { talk: 'e', change: 'lowered off the stress' },
  ],
  a: [{ talk: 'a', change: 'held' }],
  u: [
    { talk: 'u', change: 'held' },
    { talk: 'o', change: 'lowered off the stress' },
  ],
  m: [
    { talk: 'm', change: 'held' },
    { talk: 'w', change: 'opened to a glide' },
  ],
  n: [
    { talk: 'n', change: 'held' },
    { talk: 'q', change: 'pulled back beside a throat sound' },
  ],
  p: [
    { talk: 'p', change: 'held' },
    { talk: 'b', change: 'voiced' },
    { talk: 'f', change: 'rubbed open' },
    { talk: 'v', change: 'rubbed open and voiced' },
  ],
  t: [
    { talk: 't', change: 'held' },
    { talk: 'd', change: 'voiced' },
    { talk: 's', change: 'rubbed open' },
    { talk: 'z', change: 'rubbed open and voiced' },
    { talk: 'c', change: 'rubbed open on the teeth' },
    { talk: 'C', change: 'rubbed open on the teeth and voiced' },
    { talk: 'l', change: 'voiced, then loosened to a line' },
    { talk: 'r', change: 'voiced, then loosened to a roll' },
  ],
  k: [
    { talk: 'k', change: 'held' },
    { talk: 'g', change: 'voiced' },
    { talk: 'x', change: 'rubbed open at the palate' },
    { talk: 'j', change: 'rubbed open at the palate and voiced' },
    { talk: 'y', change: 'rubbed open, then opened to a glide' },
  ],
  h: [{ talk: 'h', change: 'held' }],
}

/** Talk sound to its single Rock ancestor. */
export const ANCESTOR: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const rock of Object.keys(DESCENDANTS)) {
    for (const { talk } of DESCENDANTS[rock]) {
      map[talk] = rock
    }
  }
  return map
})()

/** Sounds that left no descendant at all. */
export const LOST = Object.keys(DESCENDANTS).filter(
  s => DESCENDANTS[s].length === 0,
)

/**
 * Proves the correspondence is a clean partition: every Rock sound is
 * claimed exactly once, every Tree sound that survived descends to
 * itself, and the counts come out at 3 vowels and 14 consonants.
 */
export function checkCorrespondence(): {
  ok: boolean
  errors: Array<string>
} {
  const errors: Array<string> = []
  const seen = new Map<string, Array<string>>()

  for (const rock of Object.keys(DESCENDANTS)) {
    if (!SOUNDS.includes(rock)) {
      errors.push(`${rock} is not a Rock sound`)
    }
    for (const { talk } of DESCENDANTS[rock]) {
      const claims = seen.get(talk) ?? []
      claims.push(rock)
      seen.set(talk, claims)
    }
  }

  for (const tree of SOUNDS) {
    if (!DESCENDANTS[tree]) {
      errors.push(`${tree} has no entry`)
      continue
    }
    if (LOST.includes(tree)) {
      continue
    }
    if (!DESCENDANTS[tree].some(d => d.talk === tree)) {
      errors.push(`${tree} does not descend to itself`)
    }
  }

  for (const talk of [...TALK_VOWELS, ...TALK_CONSONANTS]) {
    const claims = seen.get(talk)
    if (!claims) {
      errors.push(`${talk} has no Tree ancestor`)
    } else if (claims.length > 1) {
      errors.push(`${talk} is claimed by ${claims.join(' and ')}`)
    }
  }

  for (const talk of seen.keys()) {
    if (![...TALK_VOWELS, ...TALK_CONSONANTS].includes(talk)) {
      errors.push(`${talk} is not a Talk sound`)
    }
  }

  const vowelCount = VOWELS.reduce((n, v) => n + DESCENDANTS[v].length, 0)
  const consonantCount = CONSONANTS.reduce(
    (n, c) => n + DESCENDANTS[c].length,
    0,
  )
  if (vowelCount !== TALK_VOWELS.length) {
    errors.push(`${vowelCount} vowel descendants, expected ${TALK_VOWELS.length}`)
  }
  if (consonantCount !== TALK_CONSONANTS.length) {
    errors.push(
      `${consonantCount} consonant descendants, expected ${TALK_CONSONANTS.length}`,
    )
  }

  return { ok: errors.length === 0, errors }
}
