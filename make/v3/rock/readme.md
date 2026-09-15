<h3 align='center'>tune rock</h3>
<p align='center'>
  The Chanted Tune
</p>

<br/>

## Introduction

**Tune Tree** is the first Tune. It has nine sounds and one syllable
shape. It gave way to **Tune Rock**, which grew to seventeen sounds and
a closed syllable, and Rock in turn gave way to **Tune Moon**.

Tree is a chanting language. It is built for song, for humming, for
keeping a beat, and for plain statements. It is not built for careful
talk. Anything that needs precision needs Rock or Moon.

Every sound in Tree is one a body makes without a tool. Two hums, three
drum hits, one breath, three vowels.

## Sounds

Nine sounds.

| mark | sound  | note                            |
| :--: | :----- | :------------------------------ |
| `i`  | `keep` | high, out, bright               |
| `a`  | `far`  | level, surface, warm            |
| `u`  | `moon` | low, inner, dark                |
| `m`  | `mark` | the good hum                    |
| `n`  | `note` | the bad hum                     |
| `p`  | `play` | the lip hit                     |
| `t`  | `time` | the tongue hit                  |
| `k`  | `king` | the throat hit, a rock chipping |
| `h`  | `heal` | the breath                      |

Vowels are the Spanish `i a u`.

**The hum.** `m` and `n` are the two sounds you can hold with your
mouth shut. They carry polarity. `m` is good, warm, toward. `n` is bad,
cold, away.

**The beat.** `p`, `t` and `k` are the three places you can stop the
air and let it go. Lips, tongue, throat. They are the drum kit.

**The breath.** `h` is grammar rather than vocabulary. It carries the
three roles and appears nowhere else.

## Syllables

Every syllable is `CV`. No clusters, no codas, no two vowels together.

```text
mi ma mu
ni na nu
pi pa pu
ti ta tu
ki ka ku

hi ha hu
```

Fifteen lexical syllables and three grammatical ones. Eighteen in all,
and that is the whole sound of the language.

## Words

A word is a root of one, two or three syllables, and an optional role
syllable on the end.

```text
ma        maha    mahi    mahu
mata      mataha  matahi  matahu
matanu    matanuha  matanuhi  matanuhu
```

There is no compounding. Tree says one thing per word. Where Rock joins
atoms to build a longer term, Tree takes a new word.

## The Three Roles

Tree marks a role with a whole syllable, because a bare vowel is not a
syllable Tree can say. The breath carries it.

| suffix | role | |
| :--- | :--- | :--- |
| `-ha` | entity | the thing form |
| `-hi` | action | the process form |
| `-hu` | feature | the property form, and how one word modifies another |

```text
tamaha = house
tamahi = build
tamahu = built

tamahu kunaha = the built dog
nataha kunahi tamaha = the person sees the house
```

### Leaving it off

The suffix is optional. In chant it usually comes off, and the role is
left to context and to the beat.

```text
nata kuna tama
```

That is a line you can drum. Say the same thing carefully and the roles
come back.

## What Tree Cannot Do

Tree has three roles. Moon has five. The two that are missing had not
been invented yet.

- **No relation form.** Moon has `-e` for links. Tree uses an action
  word in series: `nata tamahi kuna` puts the person at the house by
  saying the being-at.
- **No operator form.** Moon has `-o` for negation, conjunction,
  question and the rest. Tree has none. Negation is an ordinary word. A
  question is a tone of voice.

This is the ceiling. Tree can say what is, what happens and what
something is like. It cannot cleanly say *not*, *or*, *if*, or *of*.

## Rules

Four rules decide whether a root is a Tree word. Each one is in
`code/sound.ts` and `code/calculate.ts` reports what each one costs.

| rule | what it says |
| :--- | :----------- |
| `breath-is-grammar` | `h` never appears in a root, only on the role syllable |
| `no-triple-consonant` | no consonant carries three syllables in a row |
| `no-repeated-close-vowel` | no `i` beside `i` and no `u` beside `u`, `a` beside `a` is fine |
| `no-opening-echo` | the first two syllables never repeat |

Three of those are worth saying more about.

**Breath is grammar.** `h` carries the role and nothing else, so every
`h` in a chanted stream is the end of a word. That is what makes Tree
parseable when it is sung with no pauses.

**The echo is reserved.** A root whose first two syllables repeat,
`mama` or `kuku`, is the intensive. Fifteen shapes at two syllables and
two hundred and twenty five at three are held back for it.

**`m` and `n` are the exception to clarity.** They are the one pair in
Tree that is easy to confuse, and Tree leans on that pair rather than
avoiding it. `mata` and `nata` are meant to be a minimal pair, because
good and bad are meant to sit that close together. Every other
consonant is far from every other one, which is what a three vowel,
five consonant system buys you.

## Word Counts

Roots, before and after the rules.

| syllables | letters | pattern    |   raw |  clear | held back |
| :-------- | :------ | :--------- | ----: | -----: | --------: |
| 1         | 2       | `CV`       |    15 |     15 |         0 |
| 2         | 4       | `CVCV`     |   225 |    170 |        15 |
| 3         | 6       | `CVCVCV`   | 3,375 |  1,980 |       225 |
|           |         | **total**  |       | **2,165** |     |

Surface words, counting the bare root and the three role forms.

| root syllables | bare |  ha |  hi |  hu |    all |
| :------------- | ---: | --: | --: | --: | -----: |
| 1              |   15 |  15 |  15 |  15 |     60 |
| 2              |  170 | 170 | 170 | 170 |    680 |
| 3              | 1980 | 1980 | 1980 | 1980 |  7,920 |
|                |      |     |     |     | **8,660** |

Tree is small enough to keep whole. Rock has to be generated and Moon
has to be hand tuned, but every Tree word that survives the four rules
is in the lexicon.

The one syllable roots are the closed class. Fifteen words for the
things a language points with: this, that, me, you, one, two, yes, no.

## Beats

Tree is chanted, so what matters is how long a word runs.

| beats | shapes                | count |
| :---- | :-------------------- | ----: |
| 1     | `CV`                  |    15 |
| 2     | `CV`+`hV`, `CVCV`     |   215 |
| 3     | `CVCV`+`hV`, `CVCVCV` | 2,490 |
| 4     | `CVCVCV`+`hV`         | 5,940 |

Dropping the role syllable takes a beat off. That is the main rhythmic
move in the language: the same thought at three beats or at four,
depending on the line.

## How Tree Became Rock

Two changes.

**The beats fanned out.** Voicing and frication arrived, and they
arrived on `p`, `t` and `k` and nowhere else.

| Tree | Rock | what happened |
| :--- | :--- | :------------ |
| `i` `a` `u` | `i` `a` `u` | held, all three |
| `m` | `m` | held |
| `n` | `n` | held |
| `p` | `p` `b` `f` `v` | voicing, frication, both |
| `t` | `t` `d` `s` `z` | voicing, frication, both |
| `k` | `k` `g` `x` `j` | voicing, frication, both |
| `h` | | lost |

Five lexical consonants became fourteen. The vowels did not move at
all: it was Moon, much later, that split them.

**The breath was lost.** It was grammar, so it died with the grammar.
The role syllable `hV` wore down to a bare vowel, and with it the only
`h` in the language went.

```text
mata + hi    ->    bat + i    ->    bati
CVCV + hV          CVC + V
```

Rock has no `h`. Moon has one, but it is a weakened `k`, not this one.

## Files

| file | what it is |
| :--- | :--------- |
| `code/sound.ts` | the inventory, the rules, the sort order, and the correspondence to Rock |
| `code/calculate.ts` | generates every root and word, reports what each rule costs, writes `base/` |
| `code/fold.ts` | carries Rock back to Tree and writes `base/ancestor.csv` |
| `sounds.md` | what each of the nine sounds means |
| `words.md` | the concepts Tree has words for |

Generated data:

| file | what is in it |
| :--- | :------------ |
| `base/root/{2,4,6}.csv` | roots, by how many letters the root has |
| `base/word/{2,4,6,8}.csv` | surface words, by word length, so the number is twice the beats |
| `base/ancestor.csv` | the Moon lexicon carried all the way back |

```bash
pnpm --dir deck/tune exec tsx make/v3/rock/code/calculate.ts
pnpm --dir deck/tune exec tsx make/v3/rock/code/fold.ts
```

`fold.ts` reads `../rock/base/ancestor.csv`, so run the Rock fold
first. See `../readme.md` for the whole order.

## The Ancestral Lexicon

Tree's lexicon is not invented separately. It is the Moon lexicon
carried back through Rock, which is the only way the three can stay
consistent.

All 5,276 Rock words fold to Tree with nothing strained. They land on
69 of Tree's 170 two syllable roots, about 41%.

That ratio is the point. Nine sounds could not hold six thousand
meanings apart. `kana` in Tree stands behind garden, spirit, count,
zero, aggregate, object and vehicle in Moon, and the splitting of the
sounds is exactly what pulled them back apart.

A Rock word of two atoms comes back as two Tree words, because Tree
does not compound. Of the 5,276, six hundred and eighteen are a single
Tree word and the rest are phrases.

## License

MIT

## ClueSurf

[cluesurf](https://clue.surf)
