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
end: `h` only opens, in 199 words, and `q` only closes, in 285.

## Rules

Seven, and no more.

| rule | what it says |
| :--- | :--- |
| `no_weak_open` | a word never starts with `q`, `w` or `y` |
| `no_weak_close` | a word never ends in `h`, `w` or `y` |
| `no_lost_glide` | `w` is said nowhere in v4 |
| `no_blurred_rhyme` | a liquid closes only on `a` or `o` |
| `known_onset` | a word opening on two sounds opens on a listed cluster |
| `known_coda` | a word closing on two sounds closes on a listed cluster |
| `no_hush_in_cluster` | `x` and `j` never stand inside a cluster |

`no_blurred_rhyme` is there because a vowel running into a liquid blurs
into it. `bil` cannot be held apart from `bi`. v3 named the two front
vowels, `il el ir er`. **`u` belongs with them**, because a rounded back
vowel and a following liquid share the same tongue gesture, so `ul` and
`ur` go too. That leaves `a` and `o` as the only vowels a liquid may
close on, and it is the one rule that treats the vowels unequally.

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
| `CVC` | 19 × 89 | 1,691 | 185 |
| `CVCC` | 19 × 110 | 2,090 | 269 |
| `CCVC` | 19 × 89 | 1,691 | 156 |
| **all** | | **5,472** | **610** |

**After closeness** is what is left once no two words sound alike all
the way through. It is about a ninth of the full list.

## The Count Is A Closed Form

**Nothing has to be built to know how many words a v4 has**, and this is
what makes every question below answerable exactly.

No rule ever looks at the opening and the closing together, so every
opening is worth the same amount. A shape's count is the number of
openings times what one opening buys.

```text
P(close) = 5|close| - 3|close on l or r|
P(coda)  = 5|coda|  - 3|coda opening on l or r|

CVC   = |open|  x P(close)
CVCC  = |open|  x P(coda)
CCVC  = |onset| x P(close)

all   = (|open| + |onset|) x P(close) + |open| x P(coda)
```

The 3 is the blurred rhyme. A closing that is or begins on a liquid may
follow only `a` and `o`, so it is worth 2 vowels where every other
closing is worth 5.

Today that is `P(close)` = 5×19 − 3×2 = **89** and `P(coda)` =
5×34 − 3×20 = **110**, so the language is (19 + 19) × 89 + 19 × 110 =
**5,472**.

**Four counts decide the whole size, and which sounds they are never
enters into it.** `plan.ts` states both the formula and the build, and
checks them against each other on every run, so a change to one that
the other does not agree with is caught rather than trusted.

### With 16 openings and 32 closings

| shape | today | at 16 and 32 |
| :---- | ---: | ---: |
| `CVC` | 1,691 | 1,691 |
| `CVCC` | 2,090 | 1,900 to 2,014 |
| `CCVC` | 1,691 | 1,424 |
| **all** | **5,472** | **5,015 to 5,129** |

**`CVC` does not move at all**, because it never uses a cluster.

**`CCVC` lands on exactly 1,424 whichever three openings go**, because
every opening is worth the same 89 words and 16 × 89 = 1,424.

**`CVCC` is the only one where the choice matters**, and only in how
many of the 32 closings begin on `l` or `r`: 20 kept gives 1,900, 19
gives 1,957, 18 gives 2,014. A liquid closing is worth 38 words less
than any other, so a trim aiming to keep the count up takes the liquids
first.

## Exactly 4,096

**4,096 is 2^12, so a base word would be exactly twelve bits.**

Because the count is a closed form in four whole numbers, asking for a
particular total is a question about whole numbers and not about
sounds. Sweeping how many leave each pool finds **38 ways to land on
4,096 exactly**, and naming actual sounds comes after.

```bash
pnpm --dir deck/tune exec tsx make/v4/code/twelve.ts
pnpm --dir deck/tune exec tsx make/v4/code/rank.ts
```

`twelve.ts` writes the nearest twelve to `base/v4/4096/<nn>/`, each with
its three word lists and the pools it was built from. `rank.ts` prints
the identity for each and scores them.

The two best, by the scoring in `rank.ts`:

| | drops | `CVC` | `CVCC` | `CCVC` |
| :--- | :--- | ---: | ---: | ---: |
| **09** | `x j c C` cannot open; `sp st sl sm sn` go; `rk rg st` go | 1,335 | 1,515 | 1,246 |
| **02** | `x j c` leave the language; `sl sm sn` go; `rg` goes | 1,184 | 1,728 | 1,184 |

**09 wins on evenness**, its three shapes falling within 270 of each
other. **02 wins on symmetry**: the same three sounds leave the openings
and the closings, so the cut is one rule rather than two, and `CVC` and
`CCVC` come out identical at 1,184.

Beauty is scored rather than asserted, on five things a reader can
check: whether the three shapes come out near the same size, whether
openings and closings lose the same sounds, whether only the marked
sounds `x j c C` go and never a liquid, whether whole cluster families
go rather than odd members, and how many words survive the closeness
pass. The weights are stated at the top of `rank.ts` and the scores land
in `base/v4/4096/beauty.csv`.

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

## Joining

Two words said as one leave their consonants touching, the last of the
first word against the first of the second.

**Every join is marked with a consonant between the two words, so a
word boundary is always heard.** The mark is a sibilant matching the
voice of the consonant before it.

```text
man + man  ->  manzman        n is voiced
dag + man  ->  dagzman        g is voiced
mat + man  ->  matsman        t is voiceless
```

|           |                               |
| :-------- | :---------------------------- |
| voiced    | `m n q g d b v z j C w l r y` |
| voiceless | `p t k h s f x c`             |

That will not do when the two consonants meeting are the same, or when
they differ only by voice. Those are the two cases a listener runs
together, and a sibilant between them does not pull them apart. `l`
does.

```text
s + s  ->  sls        d + d  ->  dld        p + b  ->  plb
s + z  ->  slz        d + t  ->  dlt
```

The seven pairs that differ only by voice: `pb` `dt` `gk` `sz` `fv`
`cC` `xj`.

### The rule, written out

```text
the same consonant twice, or a voice pair    l
anything else, after a voiced consonant      z
anything else, after a voiceless consonant   s
```

Three joiners, and nothing ever runs straight together.

### How many take what

Nineteen sounds can close a word and twenty one can open one, so there
are 399 ways two words can meet.

| join | pairs | why |
| :--- | ---: | :--- |
| `z` | 234 | after a voiced sound |
| `s` | 133 | after a voiceless sound |
| `l` | 32 | 18 the same sound twice, 14 a voice pair |

Every one of the 399 is a row in `base/v4/join.csv`, as
`close,open,join,rule`. `join.ts` writes it from the rule above and
refuses to write if the counts drift from this table.

```bash
pnpm --dir deck/tune exec tsx make/v4/code/join.ts
```

### What a word cannot do, for the join to read one way

The joiner only works if it cannot be read as anything else. A run of
three consonants at a seam has three possible readings, coda cluster
then onset, coda then onset cluster, or coda then joiner then onset,
and the first two have to be shut off. So **no word may end on a
consonant plus a joiner, and none may begin on a joiner plus a
consonant.**

```text
# end          # start
Cz             sC
Cs             zC
Cl             lC
```

`l` is the easy one to miss. It is a joiner too, so `Cl` at the end and
`lC` at the start have to go for the same reason `Cs` and `sC` do, or
`rlr` reads two ways.

v3 had no clusters inside a word, so this cost it nothing. **v4 has
clusters, and its lists break the rule as they stand.** Of the
closings, `ls rs ps ks ts` end in `s` and `lz rz bz gz dz` end in `z`,
and of the openings `sk sp st sl sm sn` begin with `s`. Ten closings
and six openings would have to go for every join to read one way, and
that trade has not been made. Until it is, `bats` + `tal` and `bat` +
`stal` both come out `batsstal`, and nothing in the string says which.

This system was worked out in v3 on 2026-08-23, and the table is the
same one v3 wrote as `linker.csv`, row for row. v3 went on to a second
system that afternoon, with five joiners `m` `n` `l` `s` `z` and most
joins taking nothing. That one is in `make/v3.3/readme.md` and is not
this.

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
    join.ts      the joining rules, writes base/v4/join.csv

base/v4/
  count.csv      the table above
  onset.csv      every listed opening, and whether it reached a word
  coda.csv       every listed closing, and whether it reached a word
  join.csv       all 399 ways two words can meet, and what goes between
  full/          cvc.csv, cvcc.csv, ccvc.csv, base.csv
  lean/          cvc.csv, cvcc.csv, ccvc.csv, base.csv
```

`base.csv` carries `word,shape,onset,vowel,coda` so a word can be taken
apart without re-deriving where the cluster sits. The three per shape
files carry the words alone.
