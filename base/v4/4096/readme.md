# 4,096

**4,096 is 2^12, so a base word is exactly twelve bits.**

Three patterns reach that number, and they disagree about what to give
up for it. Each has its own folder, its own `index.csv`, and its own
numbered variants holding `cvc.csv`, `cvcc.csv`, `ccvc.csv` and the
`plan.csv` they were built from.

| pattern | what it gives up | ways found |
| :--- | :--- | ---: |
| [01-drop-clusters](01-drop-clusters) | sounds and clusters leave the language | 67 |
| [02-bar-positions](02-bar-positions) | nothing leaves, but sounds lose slots | 13 |
| [03-number-pattern](03-number-pattern) | pool sizes are chosen to be pretty | 30 |

## Why the number is reachable at all

**The count is a closed form**, so asking for a particular total is a
question about whole numbers rather than about sounds.

No rule looks at the opening and the closing together, so every opening
is worth the same amount and a shape's count is the number of openings
times what one opening buys.

```text
P(close) = 5|close| - 3|close on l or r|
P(coda)  = 5|coda|  - 3|coda opening on l or r|

CVC   = |open|  x P(close)
CVCC  = |open|  x P(coda)
CCVC  = |onset| x P(close)

all   = (|open| + |onset|) x P(close) + |open| x P(coda)
```

The 3 is the blurred rhyme. A closing on `l` or `r` may follow only `a`
and `o`, so it is worth 2 vowels where every other closing is worth 5.

**Four numbers decide the whole size and which sounds they are never
enters into it.** That is why a search finds dozens of answers instead
of one, and why every answer is exact rather than near.

Where it starts, with nothing dropped and nothing barred:

| shape | count |
| :--- | ---: |
| `CVC` | 1,869 |
| `CVCC` | 2,310 |
| `CCVC` | 1,691 |
| **all** | **5,870** |

So every pattern below is looking for 1,774 words to lose.

## Reading a variant

```text
<nn>/cvc.csv     the three letter words
<nn>/cvcc.csv    the words closing on a cluster
<nn>/ccvc.csv    the words opening on a cluster
<nn>/plan.csv    the pools and rules it was built from
```

Every word list sorts by the tone order in `code/phonology.ts`.

## Rebuilding

```bash
pnpm --dir deck/tune exec tsx make/v4/code/twelve.ts
pnpm --dir deck/tune exec tsx make/v4/code/rank.ts
pnpm --dir deck/tune exec tsx make/v4/code/whole.ts
pnpm --dir deck/tune exec tsx make/v4/code/pattern.ts
```

All four share one engine, `make/v4/code/plan.ts`, which states the
count as both a build and a formula and checks them against each other
on every single run.
