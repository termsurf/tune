/**
 * How often each sound should be heard, and how to pick a list that
 * gets close to it.
 *
 * No language uses its sounds evenly, so a Tune that does sounds wrong
 * whatever its size. This states the wanted shape once and gives one
 * picker, so every pattern that cares about frequency answers with the
 * same code rather than its own copy.
 */

import { compareWords } from './sound'
import { deal, type Piece } from './plan'

/**
 * How often each sound should be heard, relative to the others.
 *
 * `1` is an ordinary consonant. These are relative and the code
 * normalises them, so raising every number changes nothing.
 *
 *   the stops, nasals and plain rubs carry the language
 *   r is heard a little more than l
 *   x is ordinary, and j is a quarter of x
 *   w and y are uncommon, but plainer than the breath
 *   h is low
 *   c is low and C is a shade lower still, the two rarest sounds
 */
export const WEIGHT: Record<string, number> = {
  m: 1, n: 1, t: 1, k: 1, s: 1, p: 1, d: 1, b: 1, g: 1, f: 1, z: 1, v: 1,
  r: 1, l: 0.85,
  q: 0.6,
  x: 0.6, j: 0.15,
  w: 0.45, y: 0.45,
  h: 0.3,
  c: 0.16, C: 0.13,
  /** one sound each, and equal to one another */
  tx: 0.5, dj: 0.5,
  a: 1, e: 0.9, o: 0.9, i: 0.85, u: 0.75,
}

/**
 * `tx` and `dj` are two letters standing for one sound each, so a word
 * is read into units rather than letters. `tx` counts once as `tx` and
 * never as a `t` plus an `x`, which is what lets the two digraphs be
 * weighted equally while `j` on its own stays rare.
 */
export const DIGRAPHS = ['tx', 'dj']

export function toUnits(word: string): Array<string> {
  const units: Array<string> = []
  let at = 0
  while (at < word.length) {
    const two = word.slice(at, at + 2)
    if (DIGRAPHS.includes(two)) {
      units.push(two)
      at += 2
      continue
    }
    units.push(word[at])
    at += 1
  }
  return units
}

export type Profile = {
  sound: string
  want: number
  got: number
  count: number
}

export type Picked = {
  taken: Array<Piece>
  profile: Array<Profile>
  drift: number
  used: Map<string, number>
}

/**
 * Take the `want` words that best carry the wanted frequency shape.
 *
 * A word is worth the sum of its sounds' deficits, where a deficit is
 * how far below its share that sound currently sits. A word holding a
 * starved sound outscores one holding four sounds that have already had
 * their turn, so the profile pulls itself straight as it goes.
 *
 * Scoring every remaining word before every pick is millions of
 * evaluations. The deficits barely move over a handful of picks, so the
 * order is rebuilt every `BATCH` instead, which is the same answer for
 * a fraction of the work.
 *
 * **There is no randomness in here.** Every pick is decided by the
 * deficit score, and where two words score the same the tone order
 * settles it, so the same input gives the same list every time.
 */
export function pickWeighted(from: Array<Piece>, want: number): Picked {
  if (want > from.length) {
    throw new Error(`asked for ${want} of only ${from.length}`)
  }

  const BATCH = 64

  const unitsOf = new Map<string, Array<string>>()
  for (const piece of from) {
    unitsOf.set(piece.word, toUnits(piece.word))
  }

  const sounds = [...new Set(from.flatMap(p => unitsOf.get(p.word) ?? []))]
  const missing = sounds.filter(s => WEIGHT[s] === undefined)
  if (missing.length > 0) {
    throw new Error(`no weight given for ${missing.join(' ')}`)
  }

  const totalWeight = sounds.reduce((n, s) => n + WEIGHT[s], 0)
  const share = new Map(sounds.map(s => [s, WEIGHT[s] / totalWeight]))

  const order = deal(from)
  const taken: Array<Piece> = []
  const held = new Set<string>()
  const used = new Map(sounds.map(s => [s, 0]))

  let slotsTaken = 0

  while (taken.length < want) {
    const left = order.filter(p => !held.has(p.word))
    if (left.length === 0) {
      break
    }

    const sofar = Math.max(1, slotsTaken)
    const deficit = new Map(
      sounds.map(s => [s, (share.get(s) ?? 0) * sofar - (used.get(s) ?? 0)]),
    )

    const scored = left.map(piece => {
      const units = unitsOf.get(piece.word) ?? []
      let score = 0
      for (const unit of units) {
        score += deficit.get(unit) ?? 0
      }
      return { piece, score: score / units.length }
    })

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return compareWords(a.piece.word, b.piece.word)
    })

    for (let i = 0; i < BATCH && taken.length < want && i < scored.length; i++) {
      const piece = scored[i].piece
      taken.push(piece)
      held.add(piece.word)
      for (const unit of unitsOf.get(piece.word) ?? []) {
        used.set(unit, (used.get(unit) ?? 0) + 1)
        slotsTaken++
      }
    }
  }

  if (taken.length !== want) {
    throw new Error(`took ${taken.length}, wanted ${want}`)
  }

  const profile: Array<Profile> = sounds
    .map(sound => ({
      sound,
      want: (share.get(sound) ?? 0) * 100,
      got: ((used.get(sound) ?? 0) / slotsTaken) * 100,
      count: used.get(sound) ?? 0,
    }))
    .sort((a, b) => b.got - a.got)

  const drift =
    profile.reduce((n, r) => n + Math.abs(r.want - r.got), 0) / profile.length

  return { taken, profile, drift, used }
}
