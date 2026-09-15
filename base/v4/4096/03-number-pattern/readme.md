# Number pattern

**Reaches 4,096 by asking the arithmetic to be pretty as well as
correct**, so the sizes themselves mean something.

The other two patterns choose what to lose by taste and let the total
fall out. This one fixes the shape of the answer first and then finds
pools that produce it. **30 configurations land on 4,096 exactly**, and
the 13 that satisfy at least one named pattern are written here, the
richest first.

## The best one

```text
1280 + 1536 + 1280 = 4096

   5  +   6  +   5  = 16 sixteenths
```

**Variant 01.** Every shape is a multiple of 256, so the split reads
cleanly in binary. `CVC` and `CCVC` come out identical, which means the
two shapes carrying one cluster balance exactly. And the language lists
as many openings as it does onset clusters.

Variant 02 is the close runner up at **1,344 + 1,408 + 1,344**, the
evenest of all thirty, its three shapes inside 64 of each other.

## What was looked for

| pattern | found |
| :--- | :--- |
| every shape a power of two | **impossible** |
| the two one cluster shapes balance, `CVC` = `CCVC` | 10 ways |
| every shape a multiple of 256 | 1 way |
| every shape a multiple of 64 | 4 ways |
| as many openings as onset clusters | 10 ways |
| all four pools Fibonacci numbers | **impossible** |

## The two that cannot be done

Both are worth stating, because they were the first two ideas and
neither survives contact with the arithmetic.

**Every shape a power of two is impossible.** `P(close)` cannot exceed
5 × 19 = 95 and `P(coda)` cannot exceed 110, since a coda opening on a
liquid is worth 2 rather than 5 and 20 of the 34 do. For `CVC` and
`CCVC` to both be powers of two they must share `P(close)`, and working
through the cases the largest reachable third shape falls short every
time.

**Fibonacci pools are impossible.** The idea was good, because two of
the four are already true: v4 has exactly **21** openings and exactly
**34** coda clusters, consecutive Fibonacci numbers, and nobody arranged
that. Setting the other two to 13 closings and 8 onset clusters gives
totals of 4,021, 4,108 or 4,195 depending on how many liquids the
closings keep. **None is 4,096**, and with the pool sizes pinned there
is no freedom left to close the gap. 21 does not divide what is needed.

## Reading a variant

`plan.csv` gives the four pools and their exact members. Nothing is
barred and no sieve is used: these are pure pool sizes running through
the ordinary v4 rules, which is what makes the arithmetic legible.

## Rebuilding

```bash
pnpm --dir deck/tune exec tsx make/v4/code/pattern.ts
```
