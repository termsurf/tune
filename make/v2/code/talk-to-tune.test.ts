import { describe, it, expect } from 'vitest'
import {
  talkToTuneCandidates,
  talkToCandidateLevels,
  generateCandidates,
} from './talk-to-tune'

describe('talkToTuneCandidates', () => {
  // ─── Basic CVC ────────────────────────────────────────

  it('converts CVC talk to CVCVC candidates', () => {
    const candidates = talkToTuneCandidates('kat')
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word).toHaveLength(5)
      expect(c.word[0]).toMatch(/[^ywq]/) // valid C1
    }
  })

  it('keeps first consonant in CVC', () => {
    const candidates = talkToTuneCandidates('kat')
    expect(candidates[0].word[0]).toBe('k')
  })

  // ─── CVCVC (perfect fit) ──────────────────────────────

  it('converts CVCVC talk directly', () => {
    const candidates = talkToTuneCandidates('hamUr')
    expect(candidates.length).toBeGreaterThan(0)
    /** "hamur" or close variant should be top. */
    const top = candidates[0]
    expect(top.word[0]).toBe('h')
    expect(top.word[2]).toBe('m')
  })

  // ─── Consonant cluster reduction ──────────────────────

  it('reduces onset cluster (CCVC)', () => {
    const candidates = talkToTuneCandidates('brid')
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word).toHaveLength(5)
    }
    /** Should keep b or r as C1. */
    const c1s = new Set(candidates.map(c => c.word[0]))
    expect(c1s.has('b') || c1s.has('r')).toBe(true)
  })

  it('reduces coda cluster (CVCC)', () => {
    const candidates = talkToTuneCandidates('bant')
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word).toHaveLength(5)
    }
  })

  // ─── Variant consonants ───────────────────────────────

  it('maps variant consonants to nearest tune', () => {
    const candidates = talkToTuneCandidates('DaN')
    expect(candidates.length).toBeGreaterThan(0)
    /** D -> d, N -> n in tune. */
    const top = candidates[0]
    expect(top.word[0]).toBe('d')
  })

  // ─── Vowel mapping ────────────────────────────────────

  it('maps variant vowels to nearest tune', () => {
    const { levels } = talkToCandidateLevels('kAt')
    /** V1 should include 'a' as top option. */
    const v1 = levels[1]
    expect(v1.some(o => o.tune === 'a')).toBe(true)
  })

  it('maps schwa (U) to u or o', () => {
    const { levels } = talkToCandidateLevels('kUt')
    const v1 = levels[1]
    expect(v1.some(o => o.tune === 'u' || o.tune === 'o')).toBe(true)
  })

  // ─── Phonotactic filtering ────────────────────────────

  it('no candidate starts with q', () => {
    const candidates = talkToTuneCandidates('qam')
    for (const c of candidates) {
      expect(c.word[0]).not.toBe('q')
    }
  })

  it('no candidate ends with y, w, or h', () => {
    const candidates = talkToTuneCandidates('mah')
    for (const c of candidates) {
      const last = c.word[c.word.length - 1]
      expect('ywh'.includes(last)).toBe(false)
    }
  })

  it('no candidate contains "wa"', () => {
    const candidates = talkToTuneCandidates('vat')
    for (const c of candidates) {
      expect(c.word).not.toContain('wa')
    }
  })

  // ─── Scoring ──────────────────────────────────────────

  it('candidates are sorted by total score descending', () => {
    const candidates = talkToTuneCandidates('hamUr')
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i].total).toBeLessThanOrEqual(candidates[i - 1].total)
    }
  })

  it('each candidate has 5 position scores', () => {
    const candidates = talkToTuneCandidates('kat')
    for (const c of candidates) {
      expect(c.scores).toHaveLength(5)
      for (const s of c.scores) {
        expect(s).toBeGreaterThanOrEqual(0)
        expect(s).toBeLessThanOrEqual(100)
      }
    }
  })

  it('no duplicate words', () => {
    const candidates = talkToTuneCandidates('hamUr')
    const words = candidates.map(c => c.word)
    expect(words.length).toBe(new Set(words).size)
  })

  // ─── Long words ───────────────────────────────────────

  it('handles long input (CVCVCVC)', () => {
    const candidates = talkToTuneCandidates('takarim')
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word).toHaveLength(5)
    }
  })

  // ─── Short words ──────────────────────────────────────

  it('handles very short input (CV)', () => {
    const candidates = talkToTuneCandidates('ma')
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word).toHaveLength(5)
    }
  })

  // ─── generateCandidates ───────────────────────────────

  it('generates from explicit levels', () => {
    const candidates = generateCandidates([
      [{ tune: 'k', score: 100 }],
      [{ tune: 'a', score: 100 }],
      [{ tune: 't', score: 100 }],
      [{ tune: 'a', score: 50 }],
      [{ tune: 'n', score: 25 }],
    ])
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0].word).toBe('katan')
  })
})
