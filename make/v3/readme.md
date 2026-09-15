<h3 align='center'>tune</h3>
<p align='center'>
  Two Forms
</p>

<br/>

Tune has two forms. **Rock** is the older one, and **Talk** is what it
became.

| | sounds | shapes | what it is for |
| :--- | ---: | :--- | :--- |
| [rock](rock) | 9 | `CV` `CVCV` `CVCVCV` | chant, song, humming |
| [talk](talk) | 27 | `CVC` `CVCVC` `CVCVCVC` | speaking, and thinking carefully |

Both alternate consonant and vowel the whole way through. Neither has a
consonant cluster anywhere, and almost everything else follows from
that.

## Tune Rock

```text
i a u

m n
p t k
h
```

**3 vowels + 6 consonants = 9 sounds**

Every sound is one a body makes with nothing but itself. `m` and `n`
are the two hums, good and bad. `p`, `t` and `k` are the three drum
hits, lips and tongue and throat, and `k` is a rock chipped on a rock.
`h` is the breath.

A word is a root of one, two or three syllables, plus a role syllable
when the role is not already clear.

```text
ma        mata        matanu
maha      mataha      matanuha      entity
mahi      matahi      matanuhi      action
mahu      matahu      matanuhu      feature
```

The breath is grammar rather than vocabulary. It carries the role and
appears in no root, so in a chanted stream every `h` is the end of a
word. There is no compounding: Rock says one thing per word.

**2,165 roots, 8,660 words.** Small enough to keep whole.

## Tune Talk

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

**5 vowels + 22 consonants = 27 sounds**

```text
CVC
CVCVC
CVCVCVC
```

Three rules and no more: `q` never opens a syllable, `y` `w` and `h`
never close one, and no word ends on `il` `el` `ir` or `er`. With no
clusters there is nothing else to constrain.

Talk has five roles where Rock has three, because `-i` split into
action and relation and `-u` split into feature and operator. The bare
root works as a modifier.

```text
doma = house    domi = build    domu = built
mare nara = person at house
nego nara luki loka = the person does not see the dog
```

| shape | by the rules | after closeness |
| :---- | -----------: | --------------: |
| `CVC` | 1,911 | 312 |
| `CVCVC` | 200,655 | 11,232 |
| `CVCVCVC` | 21,068,775 | not computed |
| **all** | **21,271,341** | |

Joined two at a time, **8,536,405,508,631** words.

## Joining

Rock does not join at all. Talk does, and two words joined sometimes
take a consonant between them and sometimes do not.

| joiner | pairs |
| :----- | ----: |
| none | 258 |
| `m` | 33 |
| `n` | 32 |
| `l` | 18 |
| `s` | 11 |
| `z` | 11 |

Most joins take nothing. A joiner appears only where the two sounds
meeting would be hard to tell apart: a rub against a rub, a stop or
nasal against its own family, a liquid against a liquid, or anything
before `h`. See [talk/readme.md](talk) for the tables.

**No join is ambiguous**, and it needs no rule to say so. Since every
word alternates the whole way, two consonants never touch inside a
word. The only place they can touch is a seam, and a seam is either two
consonants or three. Either way it is the only such run in the word, so
the number of runs is the number of roots less one and their positions
are the cuts.

## How Rock Became Talk

Nine sounds became twenty seven. Every Talk sound has exactly one Rock
ancestor, and that is proved on every run.

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

Three vowels became five and six consonants became twenty two. The
three beats carry almost the whole load, `t` alone standing behind
eight Talk sounds.

The breath is the one that did not move. In Rock it is grammar,
carrying the role syllable and appearing in no root. In Talk it is an
ordinary consonant. Same sound, different job.

The roles doubled once:

| Rock | Talk | |
| :--- | :--- | :--- |
| `mataha` | `bata` | entity |
| `matahi` | `bati` | action |
| `matahu` | `batu` | feature |
| | `bate` | relation |
| | `bato` | operator |
| | `bat` | modifier, the bare root |

## Carrying The Lexicon Back

The two lexicons are not built separately, which would let them drift.
Talk's is the real one and Rock's is worked out from it, by replacing
every sound with its Rock ancestor and putting back the vowel Talk
dropped.

Every reconstruction says how much was invented, so a guess is never
read as a fact.

| mark | meaning |
| :--- | :--- |
| `held` | nothing was invented |
| `restored` | one or two sounds were put back |
| `strained` | three or four, so the word is a guess |

## Running It

Everything runs from the package root so the `#/` import alias
resolves.

```bash
pnpm --dir deck/tune exec tsx make/v3/rock/code/calculate.ts
pnpm --dir deck/tune exec tsx make/v3/talk/code/check.ts
pnpm --dir deck/tune exec tsx make/v3/talk/code/atom.ts
pnpm --dir deck/tune exec tsx make/v3/rock/code/fold.ts
```

## Layout

```text
make/
  readme.md      this

  rock/
    readme.md    the language
    sounds.md    what each of the 9 sounds means
    words.md     what rock has words for
    code/        sound.ts, calculate.ts, fold.ts
    base/        roots and words by length, and the lexicon carried back

  talk/
    readme.md    the language
    sounds.md    what each of the 27 sounds means
    words.md     the full concept space
    code/        sound.ts, check.ts, atom.ts, space.ts, join.ts, link.ts,
                 base-term.ts, calculate.ts, align.ts, slot.ts
    base/        word lists, the atom list, the joining table, counts
```
