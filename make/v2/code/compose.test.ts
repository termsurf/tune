import { describe, it, expect } from 'vitest'
import { composeWordCandidates } from './compose'

describe('composeWordCandidates', () => {
  // ─── Input Validation ───────────────────────────────

  it('throws on 1 syllable', () => {
    expect(() => composeWordCandidates(['hit'])).toThrow('Expected 2')
  })

  it('throws on 4 syllables', () => {
    expect(() =>
      composeWordCandidates(['hit', 'mot', 'raz', 'kin']),
    ).toThrow('Expected 2-3')
  })

  it('throws on invalid syllable (no vowel)', () => {
    expect(() => composeWordCandidates(['brt', 'mot'])).toThrow(
      'not a valid syllable',
    )
  })

  it('throws on invalid syllable (two vowels)', () => {
    expect(() => composeWordCandidates(['haik', 'mot'])).toThrow(
      'not a valid syllable',
    )
  })

  it('throws on invalid syllable (no coda)', () => {
    expect(() => composeWordCandidates(['hi', 'mot'])).toThrow()
  })

  it('throws on invalid CCVC with bad onset cluster', () => {
    expect(() => composeWordCandidates(['dlit', 'mot'])).toThrow(
      'not a valid syllable',
    )
  })

  // ─── Basic CVC + CVC ─────────────────────────────────

  it('composes CVC + CVC', () => {
    const candidates = composeWordCandidates(['hit', 'mot'])
    expect(candidates.length).toBeGreaterThan(0)

    for (const c of candidates) {
      expect(c.word.length).toBeGreaterThanOrEqual(6)
    }
  })

  it('junction has at least 2 consonants', () => {
    const candidates = composeWordCandidates(['hit', 'mot'])
    for (const c of candidates) {
      for (const j of c.junctions) {
        expect(j.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('produces candidates sorted by score descending', () => {
    const candidates = composeWordCandidates(['hit', 'mot'])
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i].score).toBeLessThanOrEqual(
        candidates[i - 1].score,
      )
    }
  })

  it('deduplicates candidates by word', () => {
    const candidates = composeWordCandidates(['hit', 'mot'])
    const words = candidates.map(c => c.word)
    const unique = new Set(words)
    expect(words.length).toBe(unique.size)
  })

  it('preserves both vowels', () => {
    const candidates = composeWordCandidates(['hit', 'mot'])
    for (const c of candidates) {
      expect(c.word).toContain('i')
      expect(c.word).toContain('o')
    }
  })

  it('preserves onset of first syllable', () => {
    const candidates = composeWordCandidates(['hit', 'mot'])
    for (const c of candidates) {
      expect(c.word.startsWith('h')).toBe(true)
    }
  })

  it('preserves coda of second syllable', () => {
    const candidates = composeWordCandidates(['hit', 'mot'])
    for (const c of candidates) {
      expect(c.word.endsWith('t')).toBe(true)
    }
  })

  // ─── CCVC shapes ──────────────────────────────────────

  it('composes CCVC + CVC (preserves onset cluster)', () => {
    const candidates = composeWordCandidates(['bran', 'mol'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word.startsWith('br')).toBe(true)
    }
  })

  it('composes CVC + CCVC', () => {
    const candidates = composeWordCandidates(['hit', 'bran'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word.length).toBeGreaterThanOrEqual(6)
      for (const j of c.junctions) {
        expect(j.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  // ─── CVCC shapes ──────────────────────────────────────

  it('composes CVC + CVCC (preserves coda cluster)', () => {
    const candidates = composeWordCandidates(['hit', 'molk'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word.endsWith('lk')).toBe(true)
    }
  })

  it('composes CVCC + CVC', () => {
    const candidates = composeWordCandidates(['bant', 'mol'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word.length).toBeGreaterThanOrEqual(6)
      for (const j of c.junctions) {
        expect(j.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  // ─── CCVC + CVCC ──────────────────────────────────────

  it('composes CCVC + CVCC (preserves both edges)', () => {
    const candidates = composeWordCandidates(['bran', 'molk'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word.startsWith('br')).toBe(true)
      expect(c.word.endsWith('lk')).toBe(true)
    }
  })

  // ─── 3-syllable composition ───────────────────────────

  it('composes 3 syllables', () => {
    const candidates = composeWordCandidates(['hit', 'mot', 'raz'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.junctions.length).toBe(2)
      for (const j of c.junctions) {
        expect(j.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('3-syllable preserves edge consonants', () => {
    const candidates = composeWordCandidates(['hit', 'mot', 'raz'])
    for (const c of candidates) {
      expect(c.word.startsWith('h')).toBe(true)
      expect(c.word.endsWith('z')).toBe(true)
    }
  })

  // ─── Geminate handling ────────────────────────────────

  it('handles geminate junction (same consonant) with separator', () => {
    const candidates = composeWordCandidates(['hit', 'tos'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      for (const j of c.junctions) {
        expect(j.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('geminate s+s inserts l (e.g., mas + sak -> maslsak)', () => {
    const candidates = composeWordCandidates(['mas', 'sak'])
    expect(candidates.length).toBeGreaterThan(0)
    const hasSLS = candidates.some(c => c.word.includes('sls'))
    expect(hasSLS).toBe(true)
  })

  it('geminate n+n inserts z (e.g., man + nak -> manznak)', () => {
    const candidates = composeWordCandidates(['man', 'nak'])
    expect(candidates.length).toBeGreaterThan(0)
    const hasNZN = candidates.some(c => c.word.includes('nzn'))
    expect(hasNZN).toBe(true)
  })

  it('geminate t+t inserts s (e.g., hit + tos -> hitstos)', () => {
    const candidates = composeWordCandidates(['hit', 'tos'])
    expect(candidates.length).toBeGreaterThan(0)
    const hasTST = candidates.some(c => c.word.includes('tst'))
    expect(hasTST).toBe(true)
  })

  // ─── Never drops vowels ───────────────────────────────

  it('never drops vowels from roots', () => {
    const candidates = composeWordCandidates(['rit', 'mol'])
    for (const c of candidates) {
      const vowelCount = c.word
        .split('')
        .filter(ch => 'ieaou'.includes(ch)).length
      expect(vowelCount).toBe(2)
    }
  })

  // ─── Phonological constraints ─────────────────────────

  it('no candidate starts with y, w, or q', () => {
    const candidates = composeWordCandidates(['kit', 'mol'])
    for (const c of candidates) {
      expect('ywq'.includes(c.word[0])).toBe(false)
    }
  })

  it('no candidate ends with y, w, or h', () => {
    const candidates = composeWordCandidates(['kit', 'mol'])
    for (const c of candidates) {
      const last = c.word[c.word.length - 1]
      expect('ywh'.includes(last)).toBe(false)
    }
  })

  it('no candidate contains the reserved "wa" joiner', () => {
    const candidates = composeWordCandidates(['kit', 'mal'])
    for (const c of candidates) {
      expect(c.word).not.toContain('wa')
    }
  })

  // ─── Multi-syllable inputs ──────────────────────────────

  it('composes CVCVC + CVC', () => {
    const candidates = composeWordCandidates(['malik', 'tos'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word.startsWith('m')).toBe(true)
      expect(c.word).toContain('a')
      expect(c.word).toContain('i')
      expect(c.word).toContain('o')
    }
  })

  it('composes CVC + CVCVC', () => {
    const candidates = composeWordCandidates(['hit', 'malik'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word.startsWith('h')).toBe(true)
      expect(c.word.endsWith('k')).toBe(true)
    }
  })

  it('composes CVCVC + CVCVC', () => {
    const candidates = composeWordCandidates(['malik', 'tabin'])
    expect(candidates.length).toBeGreaterThan(0)
    for (const c of candidates) {
      expect(c.word.startsWith('m')).toBe(true)
      expect(c.word.endsWith('n')).toBe(true)
    }
  })
})
