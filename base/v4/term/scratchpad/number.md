# The three missing numbers

**Proposals, not decisions.** `author: ai`. Per
[`rules.md`](../../../../../note/tune/pipeline/rules.md), a model never
writes its own idea into the lexicon, so these sit here until you pick.
Moving them into `tune.csv` is `v4:adopt`.

## What was actually missing

```text
0 han   1 zan   2 dob   3 suC   4 laf   5 kom   6 vip   7 xab
8 fet   9 ---  10 ---  11 cuk  12 mop  13 ---  14 tic  15 wez
```

`list.csv` says `rog` is thirteen. **`base.csv` says `rog` is east**, and
base.csv is the generated truth, so `list.csv` is stale and thirteen has
no word. That is the third gap, and it is a genuine collision rather
than an omission: the compass claimed the form.

## The picks

| | word | why |
| ---: | :--- | :--- |
| 9 | `nen` | the closest available echo of **nine**. `nin` is not in the 4,096 |
| 10 | `tem` | one sound from **ten**, which is taken by `ten` = tan. Closes on a nasal |
| 13 | `xak` | no echo exists, so chosen for distance from the other fifteen |

**Nine and ten I would defend.** The ordering rule says echo first, both
echo, and both close on a nasal, which you named as one of the most
important things.

**Thirteen I would not.** English `thirteen` has no reachable echo: `C`
and `c` are the two `th` sounds and **no `C__` or `c__` CVC is free**, so
the one route to an echo is closed. `xak` is a distance pick, and
distance is a weak reason next to feeling.

## Alternatives for thirteen, if `xak` is wrong

All free, all CVC, chosen to sit far from the existing fifteen.

| word | note |
| :--- | :--- |
| `tax` | distinct in every position, no nasal close |
| `nax` | same, and `n` reads as negative |
| `naq` | closes on `q`, the `thing` and `song` sound you wanted kept |
| `xar` | open shape, furthest of these from the other numbers |

**`naq` is the one to look at if a nasal close matters more than
distance.** I ranked it below `xak` only because `naq`, `nen`, `han` and
`zan` would then be four numbers clustered in the same vowel-plus-nasal
corner, and numbers compete in context more than any other set in the
language.

## The bigger thing this exposes

The sixteen numbers have **no recoverable structure at all**.

```text
vowels   a a o u a o i a e | e e u o a i e
pattern  i o u e e u o i i o u e e u o i
```

They do not follow the sixteen path, they do not follow any path, and
no consonant rule connects them. This is the same criticism
[`input.md`](../../../../../note/tune/pipeline/input.md) makes of the
colours, on the set that
[`../../system/16.md`](../../system/16.md) calls the most important size
in Tune.

**I am not proposing to fix it.** All fifteen are tier 1 and the fix
would move fourteen words to place three. But it is the clearest
candidate in the repo for the first real `reorganize-set` proposal once
the pipeline runs, and it is small enough to solve exactly.
