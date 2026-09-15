# Drop clusters

**Reaches 4,096 by making the language smaller.** Sounds lose the right
to open or close a word, and clusters leave the lists, until the count
falls to 2^12.

This is the blunt pattern and the honest one. It does not pretend the
language is untouched. **67 ways land on 4,096 exactly**, and the
twelve nearest to the house plan are written here, nearest first.

## What every one of them gives up

`x` and `j` go first in every variant, and `c` and `C` in almost all of
them. Those four are the marked consonants, the hushes and the two
tooth sounds, and they are the cheapest thing to lose because nothing
else leans on them.

**The liquids are the expensive ones.** `l` and `r` open the eleven
clusters `bl br fl fr gl gr kl kr pl pr tr`, and they close twenty of
the thirty four coda clusters. A variant that takes `l` or `r` out of
the openings or the closings is scored down hard for it, and the two
that do sit near the bottom of `beauty.csv`.

## The two best

| | drops | `CVC` | `CVCC` | `CCVC` |
| :--- | :--- | ---: | ---: | ---: |
| **09** | `x j c C r y` cannot open; `sp st sl sm sn` go; `rk rg st` go | 1,335 | 1,515 | 1,246 |
| **02** | `x j c C y` cannot open, `x j c` cannot close; `sl sm sn` go; `rg` goes | 1,184 | 1,728 | 1,184 |

**09 is the evenest**, its three shapes falling within 270 of each
other. **02 is the most symmetric**, `CVC` and `CCVC` coming out
identical at 1,184.

## beauty.csv

Beauty is scored rather than asserted, on five things a reader can
check. The weights are at the top of `make/v4/code/rank.ts`.

| | asks |
| :--- | :--- |
| `even` | do the three shapes come out near the same size |
| `one_rule` | do the openings and the closings lose the SAME sounds, so the cut is one rule and not two |
| `marked` | do only the marked sounds go, and never a liquid |
| `family` | do whole cluster families go, rather than odd members |
| `lean` | how many words survive the closeness pass |

`rank.ts` also prints the closed form for each variant, so the 4,096
can be checked by hand rather than taken on trust.

## Rebuilding

```bash
pnpm --dir deck/tune exec tsx make/v4/code/twelve.ts
pnpm --dir deck/tune exec tsx make/v4/code/rank.ts
```

`twelve.ts` searches and writes. `rank.ts` reads `index.csv` back and
writes `beauty.csv`.
