<h3 align='center'>tune v4</h3>
<p align='center'>
  One syllable, and a cluster on one side of it
</p>

<br/>

v3 alternated consonant and vowel the whole way through and never let
two consonants touch inside a word. v4 lets them touch, once, on one
side of the vowel or the other.

```text
CVC     bat
CVCC    bant
CCVC    brat
```

**A word carries one vowel and two or three consonants.** A cluster
stands at the start or at the end, never at both, so `CCVCC` is not a
v4 shape and neither is anything longer.

## Sounds

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

Five vowels and twenty two consonants, the same inventory v3 had.
**Two of them never turn up in a base word.** `w` is refused
everywhere, and `y` can neither open a word nor close one nor stand in
a cluster, which leaves it nowhere to go. Two more are pinned to one
end: `h` only opens, in 221 words, and `q` only closes, in 285.

## Rules

Seven, and no more.

| rule | what it says |
| :--- | :--- |
| `no_weak_open` | a word never starts with `q`, `w` or `y` |
| `no_weak_close` | a word never ends in `h`, `w` or `y` |
| `no_lost_glide` | `w` is said nowhere in v4 |
| `no_blurred_rhyme` | `il`, `el`, `ir` and `er` never stand next to each other |
| `known_onset` | a word opening on two sounds opens on a listed cluster |
| `known_coda` | a word closing on two sounds closes on a listed cluster |
| `no_hush_in_cluster` | `x` and `j` never stand inside a cluster |

`no_blurred_rhyme` is there because a close front vowel followed by a
liquid blurs into the liquid. `bil` cannot be held apart from `bi`.

## Clusters

The two lists are carried over from v3 unchanged.

**Twenty openings.**

```text
br bl dr fr fl gr gl kr kl pr pl tr vr sk sp st sl sm sn tx
```

**Forty closings.**

```text
mp nt nd qk
lp lb lf lv ls lx lz lt lc ld lk
rp rb rf rv rs rz rt rd rk rg rx
ft ps px ks kx bz gz ts dj dz
sk sp st xt
```

Then `no_hush_in_cluster` takes some back. It costs the openings `tx`,
and the closings `lx rx px kx dj xt`, so **nineteen openings and thirty
four closings reach a word.** That rule came over from v3 with the
lists, where the same six closings and one opening were listed and then
refused. `base/v4/onset.csv` and `base/v4/coda.csv` say which is which.

## Counts

| shape | arithmetic | by the rules | after closeness |
| :---- | ---: | ---: | ---: |
| `CVC` | 19 × 5 × 19 | 1,729 | 203 |
| `CVCC` | 19 × 5 × 34 | 2,470 | 295 |
| `CCVC` | 19 × 5 × 19 | 1,729 | 171 |
| **all** | | **5,928** | **669** |

**By the rules** is every word the seven rules allow. `CVC` has 19
openings, 5 vowels and 19 closings, which is 1,805, less the 76 that
end on a blurred rhyme. `CVCC` opens the same 19 ways onto 34 closings,
which is 3,230, less 760, because 20 of the 34 closings begin on `l` or
`r` and two of the five vowels cannot stand before them.

**After closeness** is what is left once no two words sound alike all
the way through. It is about an eighth of the full list.

## The Two Passes

Both are written, and neither replaces the other.

**`full` is every word the rules allow.** Nothing is thrown away and
nothing is chosen. It is the shape of the language rather than a
lexicon, and it is what to reach for when asking whether some string is
a possible v4 word.

**`lean` is the same list with the near copies taken out.** Two words
are too close when the vowels are the same or one notch apart on the
`i e a o u` ladder AND every consonant is similar to the consonant
facing it. `bat` and `pad` are too close, so one of them goes. `bat`
and `bas` are not, because `t` and `s` are not near each other.

The seventeen similarity groups come over from v3 unchanged.

```text
m n q     b p     d t     b d     p t     g k     l r
s z     x j     c C     f v     s c     z C     j C     x c     f c     C v
```

v3 shuffled the candidates before this pass, which spread the survivors
evenly across the inventory but meant two runs never agreed on the
answer. **The shuffle here is seeded**, so the spread is kept and the
list is the same every time it is built.

## Where This Came From

v4 is v3's rules stated once instead of twice.
`make/v3/talk/code/3.ts` built `CVC` and `make/v3/talk/code/4.ts` built
`CVCC` and `CCVC`, and the two files did not agree everywhere. One
language cannot let a sound open a three letter word and refuse it in a
four letter one, so where they differed v4 takes the union.

| | `3.ts` | `4.ts` | v4 |
| :--- | :--- | :--- | :--- |
| the start | refused `q`, `w`, `y` | said nothing, so `qant` passed | refuses them |
| the blurred rhyme | checked the tail only | checked every neighbouring pair | checks every pair |
| `w` | not stated, but unreachable | refused everywhere | refused everywhere |

On a three letter word the last two rows are the same test either way,
so only the start rule actually moved, and it moved onto `CVCC`.

## Running It

```bash
pnpm --dir deck/tune exec tsx make/v4/code/calculate.ts
pnpm --dir deck/tune exec tsx make/v4/code/check.ts
```

`calculate.ts` writes `base/v4/`. `check.ts` reads it back off disk and
proves it, which is the part worth re-running. It holds the generator
to eight claims: every word is one of the three shapes, every word
passes every rule, every cluster used is a listed one, no word appears
twice, `lean` sits inside `full`, no two `lean` words are too close,
`full` is complete so nothing the rules allow is missing, and
`count.csv` agrees with the files it counts.

## Layout

```text
make/v4/
  readme.md      this
  code/
    sound.ts     the inventory, the clusters, the rules, the closeness test
    calculate.ts builds base/v4/
    check.ts     reads base/v4/ back and proves it

base/v4/
  count.csv      the table above
  onset.csv      every listed opening, and whether it reached a word
  coda.csv       every listed closing, and whether it reached a word
  full/          cvc.csv, cvcc.csv, ccvc.csv, base.csv
  lean/          cvc.csv, cvcc.csv, ccvc.csv, base.csv
```

`base.csv` carries `word,shape,onset,vowel,coda` so a word can be taken
apart without re-deriving where the cluster sits. The three per shape
files carry the words alone.
