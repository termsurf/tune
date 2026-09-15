/**
 * Shared phonological analysis for Tune language.
 *
 * Contains consonant/vowel inventory, place/manner/voicing
 * classification, sonority scale, and cluster difficulty scoring.
 */

// ─── Inventory ──────────────────────────────────────────────

export const SORT_ORDER = 'ieaoumnqgdbptkhszvfxjCcyrlw'.split('')
export const CONSONANTS = new Set('mnqgdbptkhsfvzjxcCwlry'.split(''))
export const VOWELS = new Set('ieaou'.split(''))

export const CONSONANT_ORDER = 'mnqgdbptkhsfvzjxcCwlry'.split('')

export const ONSET_CLUSTERS = new Set(`br
bl
dr
fr
fl
gr
gl
kr
kl
pr
pl
tr
vr
sk
sp
st
sl
sm
sn
sw
tw
kw
tx
spr
spl
str
skr
skl
skw`.split(/\n+/))

export const CODA_CLUSTERS = new Set(
  `mp
mpf
mps
nt
ntx
nd
nts
ndz
ntc
qk
qkx
qks
lp
lb
lf
lv
ls
lx
lz
lt
lc
ld
lk
rp
rb
rf
rv
rs
rz
rt
rd
rk
rg
rx
ft
ps
px
ks
kx
bz
gz
ts
dj
dz
sk
sp
st
xt`.split(/\n+/),
)

export function isConsonant(ch: string): boolean {
  return CONSONANTS.has(ch)
}

export function isVowel(ch: string): boolean {
  return VOWELS.has(ch)
}

// ─── Phonological Properties ────────────────────────────────

export type Place =
  | 'labial'
  | 'dental'
  | 'interdental'
  | 'palatal'
  | 'velar'
  | 'glottal'

export const PLACE: Record<string, Place> = {
  m: 'labial',
  b: 'labial',
  p: 'labial',
  f: 'labial',
  v: 'labial',
  w: 'labial',
  n: 'dental',
  d: 'dental',
  t: 'dental',
  s: 'dental',
  z: 'dental',
  l: 'dental',
  r: 'dental',
  c: 'interdental',
  C: 'interdental',
  j: 'palatal',
  x: 'palatal',
  y: 'palatal',
  g: 'velar',
  k: 'velar',
  q: 'velar',
  h: 'glottal',
}

export type Manner = 'stop' | 'fricative' | 'nasal' | 'liquid' | 'glide'

export const MANNER: Record<string, Manner> = {
  b: 'stop',
  p: 'stop',
  d: 'stop',
  t: 'stop',
  g: 'stop',
  k: 'stop',
  f: 'fricative',
  v: 'fricative',
  s: 'fricative',
  z: 'fricative',
  j: 'fricative',
  x: 'fricative',
  h: 'fricative',
  c: 'fricative',
  C: 'fricative',
  m: 'nasal',
  n: 'nasal',
  q: 'nasal',
  l: 'liquid',
  r: 'liquid',
  w: 'glide',
  y: 'glide',
}

export const VOICED: Record<string, boolean> = {
  m: true,
  n: true,
  q: true,
  g: true,
  d: true,
  b: true,
  v: true,
  z: true,
  j: true,
  C: true,
  w: true,
  l: true,
  r: true,
  y: true,
  p: false,
  t: false,
  k: false,
  h: false,
  s: false,
  f: false,
  x: false,
  c: false,
}

export const SONORITY: Record<Manner, number> = {
  stop: 0,
  fricative: 1,
  nasal: 2,
  liquid: 3,
  glide: 4,
}

export function sonority(c: string): number {
  return SONORITY[MANNER[c]] ?? 0
}

export function place(c: string): Place {
  return PLACE[c] ?? 'dental'
}

export function manner(c: string): Manner {
  return MANNER[c] ?? 'stop'
}

export function voiced(c: string): boolean {
  return VOICED[c] ?? false
}

// ─── Place Distance ─────────────────────────────────────────

const PLACE_ORDER: Record<Place, number> = {
  labial: 0,
  dental: 1,
  interdental: 1,
  palatal: 2,
  velar: 3,
  glottal: 3,
}

export function placeDistance(a: string, b: string): number {
  return Math.abs(PLACE_ORDER[place(a)] - PLACE_ORDER[place(b)])
}

// ─── Cluster Difficulty Scoring ─────────────────────────────

export const HARD_THRESHOLD = 3

/**
 * Score how hard a consonant cluster is to pronounce.
 *
 * 0 = easy, 1-2 = medium, 3+ = hard (should simplify), 99 = banned.
 */

export function clusterDifficulty(cluster: string): number {
  if (cluster.length <= 1) return 0

  for (let i = 0; i < cluster.length; i++) {
    if (cluster[i] === 'h') return 99
  }

  const last = cluster[cluster.length - 1]
  if (last === 'q' || last === 'y' || last === 'w') return 99

  const first = cluster[0]
  if (first === 'w' || first === 'y') return 99

  for (let i = 1; i < cluster.length - 1; i++) {
    if (cluster[i] === 'q') return 99
  }

  for (let i = 0; i < cluster.length; i++) {
    if (cluster[i] === 'c' || cluster[i] === 'C') return 99
  }

  for (let i = 0; i < cluster.length - 1; i++) {
    if (cluster[i] === cluster[i + 1]) return 99
  }

  let score = 0

  const effectiveLength = cluster.startsWith('qk')
    ? cluster.length - 1
    : cluster.length
  if (effectiveLength >= 4) score += 5
  else if (effectiveLength >= 3) score += 2

  if (cluster.length >= 3) {
    for (let i = 0; i < cluster.length; i++) {
      const ch = cluster[i]
      if (ch === 'j') score += 3
      else if (ch === 'c' || ch === 'C') score += 2
      else if (ch === 'x') score += 2
    }
  }

  for (let i = 0; i < cluster.length - 1; i++) {
    const a = cluster[i]
    const b = cluster[i + 1]

    const aPlace = place(a)
    const bPlace = place(b)
    const aManner = manner(a)
    const bManner = manner(b)
    const aVoiced = voiced(a)
    const bVoiced = voiced(b)

    if (aPlace === bPlace && a !== b) {
      const fricativeStop =
        (aManner === 'fricative' && bManner === 'stop') ||
        (aManner === 'stop' && bManner === 'fricative')
      const liquidStop =
        (aManner === 'liquid' && bManner === 'stop') ||
        (aManner === 'stop' && bManner === 'liquid')
      const liquidFricative =
        (aManner === 'liquid' && bManner === 'fricative') ||
        (aManner === 'fricative' && bManner === 'liquid')
      const nasalStop =
        (aManner === 'nasal' && bManner === 'stop') ||
        (aManner === 'stop' && bManner === 'nasal')

      if (fricativeStop || liquidStop || nasalStop) {
        // Natural same-place combinations.
      } else if (liquidFricative) {
        score += 1
      } else {
        score += 2
      }
    }

    if (aManner === 'stop' && bManner === 'stop' && aPlace !== bPlace) {
      score += 2
    }

    const isAffricate =
      (a === 'd' && b === 'j') ||
      (a === 't' && b === 'x') ||
      (a === 'd' && b === 'z')
    if (isAffricate) {
      score -= 2
    }

    if (
      aManner === 'fricative' &&
      bManner === 'fricative' &&
      aPlace !== bPlace
    ) {
      score += 2
    }

    if (aManner === 'nasal' && bManner === 'nasal') {
      score += 2
    }

    if (
      aManner === 'nasal' &&
      bManner === 'stop' &&
      aPlace !== bPlace
    ) {
      score += 2
    }

    const isSibilant = (ch: string) => ch === 's' || ch === 'z'
    if (
      aManner === 'stop' &&
      bManner === 'fricative' &&
      aPlace !== bPlace &&
      !isAffricate &&
      !isSibilant(b)
    ) {
      score += 2
    }

    if (aPlace === 'palatal' && bPlace === 'dental') {
      score += 2
    }

    if (
      aManner === 'stop' &&
      bManner === 'nasal' &&
      aPlace !== bPlace &&
      aPlace !== 'labial' &&
      bPlace !== 'labial'
    ) {
      score += 1
    }

    if (
      aManner === 'stop' &&
      bManner === 'fricative' &&
      isSibilant(b) &&
      aPlace === 'labial'
    ) {
      score += 1
    }

    const isObstruent = (m: Manner) => m === 'stop' || m === 'fricative'
    if (
      isObstruent(aManner) &&
      isObstruent(bManner) &&
      aVoiced !== bVoiced
    ) {
      score += 2
    }

    if (
      ((aManner === 'fricative' && bManner === 'stop') ||
        (aManner === 'stop' && bManner === 'fricative')) &&
      !isSibilant(a) &&
      !isSibilant(b) &&
      !isAffricate &&
      placeDistance(a, b) >= 2
    ) {
      score += 1
    }

    if (
      aManner === 'liquid' &&
      bManner === 'stop' &&
      aPlace !== bPlace
    ) {
      score += 1
    }

    if (aManner === 'glide' && bManner !== 'liquid') {
      score += 2
    }
    if (bManner === 'glide' && aManner !== 'liquid' && i > 0) {
      score += 1
    }
  }

  if (
    cluster.length >= 3 &&
    cluster[0] === cluster[cluster.length - 1]
  ) {
    score += 2
  }

  if (cluster.length >= 3) {
    for (let i = 0; i < cluster.length - 1; i++) {
      const a = cluster[i]
      const b = cluster[i + 1]
      const aM = manner(a)
      const bM = manner(b)
      const aObs = aM === 'stop' || aM === 'fricative'
      const bObs = bM === 'stop' || bM === 'fricative'

      if (aObs && bObs && voiced(a) && voiced(b)) {
        score += 2
      }
    }
  }

  if (cluster.length >= 3) {
    const allObstruent = cluster.split('').every(c => {
      const m = manner(c)
      return m === 'stop' || m === 'fricative'
    })
    if (allObstruent) {
      score += 2
    }
  }

  if (cluster.length >= 3) {
    const places = cluster.split('').map(c => place(c))
    const allSamePlace = places.every(p => p === places[0])
    const hasLiquidOrGlide = cluster
      .split('')
      .some(c => manner(c) === 'liquid' || manner(c) === 'glide')

    if (allSamePlace && !hasLiquidOrGlide) {
      score += 3
    }
  }

  if (cluster.length >= 3) {
    const first = cluster[0]
    if (first === 'f' || first === 'v') {
      const rest = cluster.slice(1)
      if (!ONSET_CLUSTERS.has(rest)) {
        score += 1
      }
    }
  }

  if (cluster.length >= 3) {
    for (let i = 0; i < cluster.length - 2; i++) {
      const p0 = place(cluster[i])
      const p1 = place(cluster[i + 1])
      const p2 = place(cluster[i + 2])
      if (p0 === 'labial' && p1 !== 'labial' && p2 === 'labial') {
        score += 1
      }
    }
  }

  return Math.max(0, score)
}
