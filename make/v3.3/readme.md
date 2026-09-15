<h3 align='center'>tune talk</h3>
<p align='center'>
  The Spoken Tune
</p>

<br/>

## Introduction

**Tune Talk** is the Tune people speak. It came out of
[Tune Rock](../rock), which has nine sounds and one syllable shape and
is built for chant rather than for careful talk.

Talk is a constructed language for organising knowledge with clarity
and precision. It expresses ideas from a small set of base concepts
that combine in predictable ways, so that a speaker can follow the
internal logic of the language to understand an unfamiliar word rather
than having to memorise it.

## Sounds

Twenty seven sounds.

```text
i e a o u

m n q
b d g
p t k
h
s z
f v
x j
c C
y l r w
```

Five vowels and twenty two consonants. Vowels are the Spanish
`i e a o u`.

| mark | sound | note |
| :--: | :---- | :--- |
| `q` | `sing` | the -ng sound |
| `x` | `ship` | the sh sound |
| `j` | `beige` | the zh sound |
| `c` | `thor` | voiceless th |
| `C` | `this` | voiced th |
| `r` | `rise` | with a Spanish, Arabic or Indian tongue |

## Shapes

Three, and no more.

```text
CVC
CVCVC
CVCVCVC
```

Every word alternates consonant and vowel the whole way. There are no
clusters anywhere, which is the single decision the rest of the
language rests on.

## What A Word Cannot Do

Three rules.

| | |
| :--- | :--- |
| `q` never opens a syllable | no word begins `qa-`, no second syllable begins `-qa-` |
| `y`, `w` and `h` never close one | too weak to be heard at the end |
| no `il`, `el`, `ir` or `er` ending | a close front vowel blurs into a liquid |

That is the whole of the phonotactics. With no clusters there is
nothing else to constrain.

## Word Counts

| shape | by the rules | after closeness |
| :---- | -----------: | --------------: |
| `CVC` | 1,911 | 312 |
| `CVCVC` | 200,655 | 11,232 |
| `CVCVCVC` | 21,068,775 | not computed |
| **all** | **21,271,341** | |

**by the rules** is the arithmetic. `CVC` is 21 openings, since `q`
cannot open, times 5 vowels times 19 closings, less the 4 banned
rhymes: 21 × 91 = 1,911. `CVCVC` adds another opening and vowel:
21 × 5 × 1,911 = 200,655. `CVCVCVC` adds another again.

**after closeness** is what survives when no two words are alike all
the way through, where every consonant is similar to its counterpart
and every vowel adjacent to its counterpart. `CVCVCVC` is twenty one
million words and the walk does not fit in memory, so it is left
uncounted. The two that are counted fall to 16.3% and 5.6%, so the
third would be smaller again.

## Joining Words

Two words joined leave their consonants touching. Sometimes a
consonant goes between them and sometimes it does not, and which is
which depends on the two sounds that meet.

### Before breath

Everything takes `l` before `h`, with one exception.

```text
*lh          anything, then l, then h
lmh          l takes m
```

### Stops and nasals against their own kind

A stop or nasal meeting one of its own family takes `z` or `s`.

```text
msm          nasals
mzn
nsm
nzn
qsn
qzm

bzb bzp      lips
psb psp

dzd dzt      tongue
tsd tst

gzg gzk      throat
ksg ksk
```

The three stop families split on the voice of the left sound, voiced
taking `z` and voiceless taking `s`. The nasals are all voiced, so they
split on the right sound instead: `m` and `n` take `s` before `m` and
`z` before `n`, and `q` takes the opposite.

Meeting anything else, a stop or nasal takes nothing. The two
words run straight together.

### Rubs against rubs

The eight rubs meeting each other take `m` or `n`. Sixty four pairs,
each one named.

Within a pair:

```text
sms          fnf          xmx          cnc
snz          fmv          xnj          cmC
znz          vmf          jnj          Cmc
zms          vnv          jmx          CnC
```

Across pairs:

```text
snf          zmf          fns          vms
smv          znv          fmz          vnz
smx          znx          fmx          vnx
snj          zmj          fnj          vmj
snc          zmc          fnc          vmc
smC          znC          fmC          vnC

xnf          jmf          cns          Cms
xmv          jnv          cmz          Cnz
xms          jns          cmx          Cnx
xnz          jmz          cnj          Cmj
xnc          jmc          cnf          Cmf
xmC          jnC          cmv          Cnv
```

Meeting anything else, a rub takes nothing at all. The two words run
straight together.

### The liquids

```text
lsl lzr
rzl rsr
```

## How Many Take What

Over the 399 ways two words can meet:

| joiner | pairs |
| :----- | ----: |
| none | 258 |
| `m` | 33 |
| `n` | 32 |
| `l` | 18 |
| `s` | 11 |
| `z` | 11 |

Most joins take nothing at all. Both the stops and nasals and the rubs
default to running straight together, so a joiner appears only where
the two sounds meeting would be hard to tell apart.

The joiners are used evenly. `m` and `n` are thirty two each in the
rub table, with `m` one ahead only because of `lmh`. `s` and `z` are
eleven each across the stop and nasal families and the liquids.

Eighty seven pairs are named one by one and the rest follow the
general rules. Nothing is named twice and nothing contradicts.

Five joiners in all, and `r` is not one of them.

Thirty six are still open: `l` and `r` before a stop, a nasal, a rub,
`w` or `y`. The liquid rows cover `l` and `r` against each other and
against `h`, and nothing else.

## No Join Is Ambiguous

This is what having no clusters buys, and it is worth stating plainly.

Every word alternates consonant and vowel the whole way, so **two
consonants never touch inside a word**. The only place they can touch
is a seam. A seam with no joiner shows two consonants together, and a
seam with a joiner shows three. Either way it is the only such run in
the word, so it cannot be anywhere else.

```text
CVC + CVC        ->  CVCCVC      the CC is the seam
CVC + J + CVC    ->  CVCCCVC     the middle C is the joiner
```

Three atoms give two such runs, four give three. The number of runs is
the number of roots less one, and their positions are the cuts. Nothing
has to be memorised and no rule has to be applied.

Checked over every atom shape and every join, with and without a
joiner: **17 distinct shapes, no collisions.**

## Join Counts

Seven pairings.

| join | shape | count | after closeness |
| :--- | :---- | ----: | --------------: |
| `CVC` + `CVC` | `CVCCVC` | 3,651,921 | 97,344 |
| `CVC` + `CVCVC` | `CVCCVCVC` | 383,451,705 | 3,504,384 |
| `CVCVC` + `CVC` | `CVCVCCVC` | 383,451,705 | 3,504,384 |
| `CVC` + `CVCVCVC` | `CVCCVCVCVC` | 40,262,429,025 | |
| `CVCVCVC` + `CVC` | `CVCVCVCCVC` | 40,262,429,025 | |
| `CVCVC` + `CVCVCVC` | `CVCVCCVCVCVC` | 4,227,555,047,625 | |
| `CVCVCVC` + `CVCVC` | `CVCVCVCCVCVC` | 4,227,555,047,625 | |
| **all** | | **8,536,405,508,631** | |

| | |
| :--- | ---: |
| atoms alone | 21,271,341 |
| two atom joins | 8,536,405,508,631 |
| **in all** | **8,536,426,779,972** |

Nothing is subtracted, because no two joins reach the same word.

`CVCVC` + `CVCVC` and `CVCVCVC` + `CVCVCVC` are not on the list. Both
are collision free, so leaving them out is a decision about how long a
word may run rather than anything the shapes force.

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
doma = house       domi = build      domu = built
mare nara = person at house
nego nara luki loka = the person does not see the dog
```

The bare root modifies what follows it: `brk doma` is a bright house.

## Sentences

```text
A Ri B      action        nara luki loka      person sees dog
A Re B      relation      nara mare doma      person in house
Ro X        operator      nego nara luki loka not (person sees dog)
```

Talk separates content from control. Things, actions, properties and
relations carry meaning. Operators say what to do with it. That is what
lets a short sentence carry a complicated thought without extra
grammar.

## Where Talk Came From

Rock has nine sounds and Talk has twenty seven. Every Talk sound has
exactly one Rock ancestor, and that is checked on every run.

| Rock | Talk | what happened |
| :--- | :--- | :------------ |
| `i` | `i` `e` | lowered off the stress |
| `a` | `a` | held |
| `u` | `u` `o` | lowered off the stress |
| `m` | `m` `w` | opened to a glide |
| `n` | `n` `q` | pulled back beside a throat sound |
| `p` | `p` `b` `f` `v` | voicing and frication |
| `t` | `t` `d` `s` `z` `c` `C` `l` `r` | voicing, frication, and loosening to a liquid |
| `k` | `k` `g` `x` `j` `y` | voicing, palatalisation, and opening to a glide |
| `h` | `h` | held |

Rock's `h` is grammar rather than vocabulary: it carries the role
syllable and appears in no root. In Talk it is an ordinary consonant
that can sit anywhere. Same sound, different job.

## Files

| file | what it is |
| :--- | :--------- |
| `code/sound.ts` | the inventory, the shapes, the rules, the sort order |
| `code/check.ts` | measures `tune.csv` against the shapes |
| `code/atom.ts` | builds the atomic root list, writes `tune.3.csv` |
| `code/base-term.ts` | which concepts deserve a root, against Mandarin and Vietnamese |
| `code/space.ts` | counts the word space and writes the word lists |
| `code/join.ts` | the join counts and the ambiguity check |
| `code/link.ts` | the joining table |
| `code/align.ts` | lays `tune.csv` out in aligned columns |
| `code/slot.ts` | splits the lexicon by shape |
| `sounds.md` | what each of the twenty seven sounds means |
| `words.md` | the full concept space |

```bash
pnpm --dir deck/tune exec tsx make/talk/code/check.ts
pnpm --dir deck/tune exec tsx make/talk/code/atom.ts
```

## License

MIT

## ClueSurf

[cluesurf](https://clue.surf)
