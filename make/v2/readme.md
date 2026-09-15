<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<p align='center'>
  <img src='https://github.com/cluesurf/tune/blob/make/view/moon.svg?raw=true' height='222'/>
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

## Words

- "Base" words can be 1, 2, or 3 syllables
- "Compound base words" can be 2 to 9 syllables in theory
  - ...but more likely 2-4 syllables, maybe 5
  - Composed of 2 or 3 joined base words
- "Compound _extension_ words" can be composed of any number of words, joined with `-wa-`
  - But mentally more than a few words as a single unit seems like it would be hard to mentally parse
- All words must start and end with a consonant

## Word Rules

- `w` is reserved for joining words beyond the "compact" 2-3 word
  joining method, used as `-wa-`, so `w` is not used anywhere else in
  words.
- `y` and `h` can only appear at the beginning of words.
- `q` can only appear at the end of words, so not at the
  beginning or middle, except it can be in the middle as `qk`.
- Consonants on base words can come in clusters of max length 2 (e.g. `gotxin`).
- Compound base word consonant clusters can become max 3 in length (e.g. `lamproq`).
- For multi-syllable words, emphasis is on last vowel.
- Adjacent obstruents (`b d g p t k s z f v c C x j`) in consonant clusters must share voicing, determined by the leftmost one (e.g. `ks` ok, `kz` becomes `ks`). Nasals and liquids are neutral. This becomes particularly important at the join part in compound words, where consonant clusters are 2-3 in length.

### Word Pattern Rules

These are the allowed _base_ word patterns for the foreseeable future:

| syllables | characters | patterns          |   estimated |    theoretical |
| :-------- | :--------- | :---------------- | ----------: | -------------: |
| 1         | 3          | `CVC`             |        ~700 |          1,805 |
| 1         | 4          | `CCVC` and `CVCC` |        ~700 |          6,460 |
| 2         | 5          | `CVCVC`           |      ~2,000 |        171,475 |
| 3         | 7          | `CVCVCVC`         |     ~47,000 |     16,290,125 |
|           |            | **total**         | **~50,000** | **16,469,865** |

The reason for the estimated/theoretical difference: theoretical is the
mathematical number of possible combinations given the 22 consonants and
5 vowels in those patterns, but the estimated is a much smaller set
mostly because of the rules put in place to filter out words that sound
similar or have hard/undesirable pronunciations.

Note: 1 syllable, 5-characters not supported, and 2-syllable, 6+
characters not supported (primarily because they would look like
"joined" words, and there needs to be a way to distinguish joined words
and their base word parts, vs. base words by themselves, even though you
can't 100% tell exactly the join word parts, because of merging dynamics
at join points, hard to reverse-engineer fully, but that's okay, not a
major goal or need, just kind of neat to realize what a joined word is
composed of sometimes, like when you know a word's etymology).

**Bottom line**: Since there's **~50k** possible base words, that should
cover most stuff. Everything else can be compound words.

### Word Joining Rules

Compose **2-3** base words into compound words. Joined words are considered "compound base words", because they have the _feeling_ of being a single unit.

At each join point, the
coda of word 1 meets the onset of word 2, forming a consonant cluster.

- Junction must have at least 2 consonants (CC minimum)
- Resolution priority: keep intact > overlap > onset/coda match >
  mapped > assimilated > partial drop > geminate
- **Overlap**: if coda ends with same consonant onset starts with, merge
  them (e.g. `nt` + `tr` → `ntr`)
- **Partial drop**: for 3-4C clusters, drop one consonant to make it
  pronounceable
- **Geminate separator**: when same or confusable consonants meet,
  insert a separator and keep both (voice-assimilating the second to
  match the first). `q` always becomes `n`.
  - Fricatives (`f v s z c C j x`): any pair inserts `l`, second
    voice-assimilated (e.g. `sz` → `sls`, `sv` → `slf`, `vf` → `vlv`,
    `fC` → `flc`)
  - Nasals (`n m`): insert `z`, keep both (e.g. `nm` → `nzm`, `qn` →
    `nzn`)
  - Voiced stops (`b d g`): insert `z`, keep both (e.g. `bd` → `bzd`,
    `db` → `dzb`)
  - Voiceless stops (`p t k`): insert `s`, keep both (e.g. `pk` →
    `psk`, `kt` → `kst`)
  - Mixed voiced/voiceless stops: separator based on first, second
    voice-assimilated (e.g. `bt` → `bzd`, `tb` → `tsp`, `gk` → `gzg`)
- `wa` sequence is reserved for tier-3 word joining, not used in compact
  joins
- Candidates scored by phoneme preservation, cluster ease, and word
  length

Because of this joining logic, it's actually deterministic, so there's a
map from source joining cluster to target
[here](https://github.com/cluesurf/tune/blob/make/text/consonant-clusters-mapping.json).

Here are some examples of how joins may look in the end:

| syllables | words | characters | sources               | patterns                                     | estimated | theoretical |
| :-------- | :---- | :--------- | :-------------------- | :------------------------------------------- | --------: | ----------: |
| 2         | 2     | 6          | `CVC` + `CVC`         | <code>CV<strong>CC</strong>VC</code>         |       49K |        3.3M |
| 2         | 2     | 7          | `CVC` + `CCVC`        | <code>CV<strong>CCC</strong>VC</code>        |     24.5K |        3.1M |
| 2         | 2     | 7          | `CVC` + `CVCC`        | <code>CV<strong>CC</strong>VCC</code>        |     24.5K |        8.6M |
| 2         | 2     | 7          | `CCVC` + `CVC`        | <code>CCV<strong>CC</strong>VC</code>        |     24.5K |        3.1M |
| 2         | 2     | 7          | `CVCC` + `CVC`        | <code>CV<strong>CCC</strong>VC</code>        |     24.5K |        8.6M |
| 2         | 2     | 8          | `CCVC` + `CCVC`       | <code>CCV<strong>CCC</strong>VC</code>       |     12.2K |        2.9M |
| 2         | 2     | 8          | `CCVC` + `CVCC`       | <code>CCV<strong>CC</strong>VCC</code>       |     12.2K |        8.1M |
| 2         | 2     | 8          | `CVCC` + `CCVC`       | <code>CV<strong>CCCC</strong>VC</code>       |     12.2K |        8.1M |
| 2         | 2     | 8          | `CVCC` + `CVCC`       | <code>CV<strong>CCC</strong>VCC</code>       |     12.2K |       22.6M |
| 3         | 2     | 8          | `CVC` + `CVCVC`       | <code>CV<strong>CC</strong>VCVC</code>       |      140K |        310M |
| 3         | 2     | 8          | `CVCVC` + `CVC`       | <code>CVCV<strong>CC</strong>VC</code>       |      140K |        310M |
| 3         | 2     | 9          | `CCVC` + `CVCVC`      | <code>CCV<strong>CC</strong>VCVC</code>      |       70K |        293M |
| 3         | 2     | 9          | `CVCC` + `CVCVC`      | <code>CV<strong>CCC</strong>VCVC</code>      |       70K |        815M |
| 3         | 2     | 9          | `CVCVC` + `CCVC`      | <code>CVCV<strong>CCC</strong>VC</code>      |       70K |        293M |
| 3         | 2     | 9          | `CVCVC` + `CVCC`      | <code>CVCV<strong>CC</strong>VCC</code>      |       70K |        815M |
| 4         | 2     | 10         | `CVC` + `CVCVCVC`     | <code>CV<strong>CC</strong>VCVCVC</code>     |      3.5M |       29.4B |
| 4         | 2     | 10         | `CVCVC` + `CVCVC`     | <code>CVCV<strong>CC</strong>VCVC</code>     |      400K |       29.4B |
| 4         | 2     | 10         | `CVCVCVC` + `CVC`     | <code>CVCVCV<strong>CC</strong>VC</code>     |      3.5M |       29.4B |
| 4         | 2     | 11         | `CCVC` + `CVCVCVC`    | <code>CCV<strong>CC</strong>VCVCVC</code>    |     1.75M |       27.9B |
| 4         | 2     | 11         | `CVCC` + `CVCVCVC`    | <code>CV<strong>CCC</strong>VCVCVC</code>    |     1.75M |       77.4B |
| 4         | 2     | 11         | `CVCVCVC` + `CCVC`    | <code>CVCVCV<strong>CCC</strong>VC</code>    |     1.75M |       27.9B |
| 4         | 2     | 11         | `CVCVCVC` + `CVCC`    | <code>CVCVCV<strong>CC</strong>VCC</code>    |     1.75M |       77.4B |
| 5         | 2     | 12         | `CVCVC` + `CVCVCVC`   | <code>CVCV<strong>CC</strong>VCVCVC</code>   |       10M |        2.8T |
| 5         | 2     | 12         | `CVCVCVC` + `CVCVC`   | <code>CVCVCV<strong>CC</strong>VCVC</code>   |       10M |        2.8T |
| 6         | 2     | 14         | `CVCVCVC` + `CVCVCVC` | <code>CVCVCV<strong>CC</strong>VCVCVC</code> |      250M |        265T |
|           |       |            |                       | **total**                                    | **~290M** |   **~270T** |

Note: This is just showing all the possible 2-word combinations, but
there's *tons* of 3 word combinations in theory too! So numbers get large.
Also, since we have that joining map simplification logic, the numbers
might not be totally perfect, but they are reasonable ballparks.

Also! You can join words arbitrarily in casual or scientific contexts to create unlimited compounds to your heart's content, by using the `-wa-` joiner too.

The `-wa-` joined words are considered just "compound extension words", which have _sort-of_ the feeling of being a single word, but you can tell quickly they are separate words joined together, but still, because it's one word technically, your mind feels it as a formal concept rather than a descriptive phrase. _(The purpose of `-wa-` is to distinguish "unified/standard concepts" from "arbitrary phrases". For example, in English we have "black bird" as a generic description, but we have "blackbird" as a specific type of bird species. Kinda vague/not that ideal when you start splitting hairs. Tune's system is intentionally a lot more structured than English in this sense, to make things a ton less ambiguous/a lot clearer)._

### Word Selection Rules

#### 5-letter words (CVCVC)

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

#### 7-letter words (CVCVCVC)

- All 5-letter rules above, plus:
- No `h`, `y`, `q` in interior consonants (positions 2, 4)
- No sequential same consonant across vowels (positions 0-2, 2-4, 4-6)
  for `r l f v z x j C c s`
- Weighted random sampling with frequency weights (e.g. `t`:10, `j`:0.3)
- Every word guaranteed at least one `a`

## Code Library

### Word Composition

Compose 2-3 root syllables into coined words. Each root can be a single
syllable (CVC, CVCC, CCVC) or multi-syllable (CVCVC, etc.). Junctions
between roots always have at least 2 consonants.

```ts
import { composeWordCandidates } from './code/compose'

const candidates = composeWordCandidates(['hit', 'mot'])
// Returns ranked candidates like:
// [{ word: 'hitmot', pattern: '...', junctions: ['tm'], score: 0.85 }, ...]

// 3 roots
composeWordCandidates(['hit', 'mot', 'raz'])

// Multi-syllable roots
composeWordCandidates(['malik', 'tos'])
```

Each candidate has:

- **word** - the composed word
- **pattern** - structural pattern label
- **junctions** - consonant clusters at each join point
- **score** - quality score (higher is better)

**Junction rules.** When two roots meet, the coda of the first and onset
of the second form a consonant cluster. This cluster gets simplified to
something pronounceable as described in the joining rules section above.

**Regenerate cluster mappings:**

```sh
npx tsx ./make/sounds.ts
```

Output goes to `./text/`.

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
