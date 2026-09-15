<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<p align='center'>
  <img src='https://github.com/cluesurf/tune/blob/make/view/tune.svg?raw=true' height='222'/>
</p>

<h3 align='center'>tune</h3>
<p align='center'>
  A measured speaking language Λ
</p>

<br/>

<p align="center">
<em>These are the parts your mouth and tongue shape.</em><br/>
<em>Sharing yourself in new ways to the lake.</em><br/>
<em>These are the symbols representing sound bits.</em><br/>
<em>Combining into a rhythm like the drum hits.</em><br/>
<em>Soon you'll notice that each twist and turn fits.</em><br/>
</p>
<p align="center">
<em>These are the wholes that link the speech tones.</em><br/>
<em>Morphing our intelligence as we play with each stone.</em><br/>
<em>These are the words we separate with spaces.</em><br/>
<em>Defining them carefully so we get down to the basics.</em><br/>
<em>You'll soon learn how to use them in statements.</em><br/>
</p>
<p align="center">
<em>These are the threads that frame what you speak.</em><br/>
<em>Giving others a peek at your inner geek.</em><br/>
<em>These are the sentences your voice brings in the night.</em><br/>
<em>Manifesting the invisible in the mind's eye.</em><br/>
<em>Now you're a chat master, next is an invite.</em><br/>
</p>
<p align="center">
<em>These are the structures that make the light whiter.</em><br/>
<em>Making it possible to communicate about the higher.</em><br/>
<em>These are the trees in which we mold information.</em><br/>
<em>Seeing ourselves and the universe as one big computation.</em><br/>
<em>The key thing to remember is patterns and patience.</em><br/>
</p>
<p align="center">
<em>These are the networks merging everything into one.</em><br/>
<em>Connecting knowledge together like the moon and the sun.</em><br/>
<em>These are the primary thing the earth yields.</em><br/>
<em>Filling the memory with energy from brook and field.</em><br/>
<em>If you've made it this far it's the stone that you wield.</em><br/>
</p>
<br/>
<br/>

## Introduction

**Tune** is a constructed language designed to organize knowledge with clarity and precision. Its goal is to express ideas using a minimal set of base concepts that combine in predictable ways, reducing ambiguity while remaining easy to speak and understand. By structuring meaning systematically, Tune aims to make complex ideas easier to grasp and communicate.

The language is built to scale from everyday conversation to highly technical domains. Scientific terms, abstract ideas, and specialized jargon can be expressed by composing simple core concepts, allowing new discoveries and technologies to be named in a consistent and intelligible way. Instead of memorizing thousands of opaque terms, speakers can follow the internal logic of the language to understand unfamiliar concepts.

Ultimately, Tune is meant to serve as a flexible conceptual framework rather than just a vocabulary. It provides a structured way to describe the world, allowing knowledge to be organized, extended, and shared across disciplines and cultures. As human understanding grows, the language is designed to grow with it while preserving clarity and coherence.

## Sounds

| mark | sound     | note                                       |
| :--: | :-------- | :----------------------------------------- |
| `m`  | `mark`    |                                            |
| `n`  | `note`    |                                            |
| `q`  | `sing`    | the -ng sound                              |
| `g`  | `gift`    |                                            |
| `d`  | `deed`    |                                            |
| `b`  | `band`    |                                            |
| `p`  | `play`    |                                            |
| `t`  | `time`    |                                            |
| `k`  | `king`    |                                            |
| `h`  | `heal`    |                                            |
| `s`  | `soul`    |                                            |
| `f`  | `fire`    |                                            |
| `v`  | `vibe`    |                                            |
| `z`  | `zone`    |                                            |
| `j`  | `beige`   | the "g" sound here, "zh"                   |
| `x`  | `ship`    | the "sh" sound                             |
| `c`  | `thor`    | the voiceless "th" sound                   |
| `C`  | `this`    | the voiced "th" sound                      |
| `w`  | `wave`    |                                            |
| `l`  | `love`    |                                            |
| `r`  | `rise`    | but with spanish, arabic, or indian accent |
| `y`  | `yard`    |                                            |

(vowels are like spanish `i e a o u` sounds).

Five vowels and twenty two consonants, twenty seven sounds in all.

## Words

Every Tune word alternates consonant and vowel the whole way through.
There are no consonant clusters anywhere, and nearly everything else
about the language follows from that one decision.

```text
CVC
CVCVC
CVCVCVC
```

- A **base word** is one, two or three syllables
- A **compound word** is two base words joined
- Every word starts and ends with a consonant

## Word Rules

Three rules, and no more.

- `q` never opens a syllable
- `y`, `w` and `h` never close one
- No word ends on `il`, `el`, `ir` or `er`

With no clusters there is nothing else to constrain. Emphasis falls on
the first syllable.

## Word Counts

| syllables | characters | pattern     | by the rules | after closeness |
| :-------- | :--------- | :---------- | -----------: | --------------: |
| 1         | 3          | `CVC`       |        1,911 |             312 |
| 2         | 5          | `CVCVC`     |      200,655 |          11,232 |
| 3         | 7          | `CVCVCVC`   |   21,068,775 |    not computed |
|           |            | **total**   | **21,271,341** |               |

**By the rules** is the arithmetic. `CVC` is 21 openings, since `q`
cannot open, times 5 vowels times 19 closings, less the 4 banned
rhymes: 21 × 91 = 1,911. Each further syllable multiplies by another
21 × 5.

**After closeness** is what survives once no two words are alike all
the way through, where every consonant is similar to its counterpart
and every vowel next to its counterpart on the `i e a o u` ladder. That
is what the selection rules below are for.

## Word Joining

Two base words joined make a compound. Seven pairings:

| join | shape | count |
| :--- | :---- | ----: |
| `CVC` + `CVC` | `CVCCVC` | 3,651,921 |
| `CVC` + `CVCVC` | `CVCCVCVC` | 383,451,705 |
| `CVCVC` + `CVC` | `CVCVCCVC` | 383,451,705 |
| `CVC` + `CVCVCVC` | `CVCCVCVCVC` | 40,262,429,025 |
| `CVCVCVC` + `CVC` | `CVCVCVCCVC` | 40,262,429,025 |
| `CVCVC` + `CVCVCVC` | `CVCVCCVCVCVC` | 4,227,555,047,625 |
| `CVCVCVC` + `CVCVC` | `CVCVCVCCVCVC` | 4,227,555,047,625 |
| | **total** | **8,536,405,508,631** |

### The joiner

Where two words meet, sometimes a consonant goes between them and
sometimes nothing does. Most joins take nothing.

| joiner | pairs |
| :----- | ----: |
| none | 258 |
| `m` | 33 |
| `n` | 32 |
| `l` | 18 |
| `s` | 11 |
| `z` | 11 |

A joiner appears only where the two sounds meeting would be hard to
tell apart.

- **Before breath.** Everything takes `l` before `h`, except `l`
  itself, which takes `m`.
- **A stop or nasal against its own family** takes `z` or `s`. The
  stop families split on the voice of the left sound, `bzb` `psp`
  `dzd` `tst` `gzg` `ksk`. The nasals are all voiced so they split on
  the right sound instead, `msm` `mzn` `nsm` `nzn`, with `q` running
  the opposite way, `qsn` `qzm`.
- **A rub against a rub** takes `m` or `n`, by a table of sixty four
  named pairs, `sms` `snz` `fnf` `fmv` and so on.
- **A liquid against a liquid**, `lsl` `lzr` `rzl` `rsr`.
- Everything else runs straight together.

The full tables are in [make/v3/talk](make/v3/talk).

### No join is ambiguous

This is what having no clusters buys, and it needs no rule to state it.

Since every word alternates the whole way, two consonants never touch
inside a word. The only place they can touch is a seam, and a seam is
either two consonants or three.

```text
CVC + CVC        ->  CVCCVC      the CC is the seam
CVC + J + CVC    ->  CVCCCVC     the middle C is the joiner
```

Either way it is the only such run in the word. The number of runs is
the number of roots less one, and their positions are the cuts. Three
base words give two runs, four give three. Nothing has to be memorised
and no rule has to be applied to read a compound apart.

## Word Forms

For a root `R`:

```text
R    modifier (bare root)
Ra   entity, what exists
Ri   action, what happens
Ru   feature, what something is like
Re   relation, how things connect
Ro   operator, how meaning is controlled
```

```text
doma = house    domi = build    domu = built
nara luki loka        person sees dog
nara mare doma        person in house
nego nara luki loka   not (person sees dog)
```

The bare root modifies what follows: `brk doma` is a bright house.

Tune separates content from control. Things, actions, properties and
relations carry the meaning. Operators say what to do with it. That is
what lets a short sentence carry a complicated thought without extra
grammar.

## Tune Rock

Tune has an older form, **[Tune Rock](make/v3/rock)**, with nine sounds
and one syllable shape.

```text
i a u        m n        p t k        h
```

Every sound is one a body makes with nothing but itself. `m` and `n`
are the two hums, good and bad. `p`, `t` and `k` are the three drum
hits, lips and tongue and throat. `h` is the breath, and there it is
grammar rather than vocabulary: it carries the role syllable and
appears in no root.

Rock is built for chant, song and humming, and for plain statements. It
does not join words at all. **2,165 roots, 8,660 words.**

Every Tune sound has exactly one Rock ancestor. The three beats carry
almost the whole load, `t` alone standing behind `t d s z c C l r`.

## Word Selection Rules

The three word rules say what is legal. These say what is worth using.
Legal is not the same as usable: `mir` and `nir` are both legal and one
of them has to go, or a listener cannot tell them apart. What follows
is how the lexicon is narrowed from what the shapes allow down to words
that stay distinct in the ear.

### 5-letter words (CVCVC)

- No `w` anywhere
- No `q`, `w`, `y` at start
- No `h`, `w`, `y` at end
- No `h`, `y`, `q` in center consonant (position 2)
- No `el`, `er`, `il`, `ir` sequences anywhere
- `j` only at start of word
- No mixed-voicing stop pairs across vowels: `d-t`, `t-d`, `b-p`, `p-b`,
  `g-k`, `k-g` blocked
- Fricative pairs across vowels: same pair always blocked
  (`s-s`/`s-z`/`z-s`/`z-z`, likewise `f↔v`, `c↔C`, `j↔x`). Cross-pair
  allowed only if voicing matches (e.g. `f-s` fine, `f-C` blocked)
- Max 1 of `x`/`j`/`c`/`C` total per word
- **Too close** if words differ by 1 position
- **Too close** if words differ by 1 vowel + 1 neighboring consonant,
  and vowel is off by 1 notch (`ieaou` order)
- **Too close** if words differ by 1 vowel + 1 neighboring consonant,
  vowel off by 2+, but consonant stays in the same broad group:
  - Stops/nasals: `b m p n q d g t k`
  - Fricatives: `h s f v z x j c C`
  - Liquids: `l r`

### 7-letter words (CVCVCVC)

- All 5-letter rules above, plus:
- No `h`, `y`, `q` in interior consonants (positions 2, 4)
- No sequential same consonant across vowels (positions 0-2, 2-4, 4-6)
  for `r l f v z x j C c s`
- Weighted random sampling with frequency weights (e.g. `t`:10, `j`:0.3)
- Every word guaranteed at least one `a`

## Summary

_Note: Tune is just in the prototype phases right now. Check out the
[website](https://tune.surf) for the latest grammar, lexicon, and other
things. And a recent
[spreadsheet](https://docs.google.com/spreadsheets/d/1h-Hh9Wc49DwuVRBM5Im0kjiZM0dlLjERYJLKajg_SF0/edit?usp=sharing)
too._

## License

Copyright 2021-2025 <a href='https://clue.surf'>ClueSurf</a>

Licensed under the Apache License, Version 2.0 (the "License"); you may
not use this file except in compliance with the License. You may obtain
a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## ClueSurf

Made by [ClueSurf](https://clue.surf), meditating on the universe ¤.
Follow the work on [YouTube](https://youtube.com/@cluesurf),
[X](https://x.com/cluesurf),
[Instagram](https://instagram.com/cluesurf),
[Substack](https://cluesurf.substack.com),
[Facebook](https://facebook.com/cluesurf), and
[LinkedIn](https://linkedin.com/company/cluesurf), and browse more of
our open-source work here on [GitHub](https://github.com/cluesurf).
