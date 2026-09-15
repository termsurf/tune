# Bar positions

**Reaches 4,096 without making the language any smaller.**

All 22 consonants stay. All 5 vowels stay. All 19 openings, all 19
closings, all 19 onset clusters and all 34 coda clusters stay, and
**every one of them reaches a word**. Nothing is dropped.

What changes is WHERE a sound may stand. A rule refuses a family at one
slot of one shape, so the family is still free everywhere else.

```text
a three letter word never closes on a hush or a tooth sound
a word closing on a cluster never opens on a liquid
a word opening on a cluster never closes on a stop
```

Each is a sentence somebody could say about the language, which is the
point. A sound is not lost, it is placed.

**13 ways land on 4,096 exactly.** Five of them keep every pool member
in use and are written here.

## The five

| n | `CVC` | `CVCC` | `CCVC` | what it says |
| ---: | ---: | ---: | ---: | :--- |
| 01 | 1,161 | 1,585 | 1,350 | no hush or tooth closes a `CVC`; no liquid and no breath opens a `CVCC` |
| 02 | 1,558 | 1,192 | 1,346 | no liquid and no stop opens a `CVCC`; no liquid closes a `CCVC` |
| 03 | 1,245 | 1,409 | 1,442 | no hush or tooth closes a `CVC`; no hush, tooth or glide opens a `CVCC` |
| 04 | 1,559 | 1,925 | 612 | no hush, tooth or stop closes a `CCVC` |
| 05 | 857 | 1,879 | 1,360 | no hush, tooth or voiceless stop opens a `CVC`; no nasal closes one |

**03 is the evenest**, its three shapes inside 200 of each other.
**04 is the most lopsided**, spending almost everything on `CVCC`.

## The two knobs behind the rules

When position rules alone overshoot, two more are available, and both
are even across the whole inventory.

**`echo`** refuses a word that opens and closes on the same consonant,
or on two consonants from one similarity group. **This is the rule
Semitic roots follow**, and it is a real thing about words rather than
a way of hitting a number. On its own it takes 5,870 down to 4,631.

**`sieve`** keeps a word when the sum of its sounds' ranks, modulo m,
is one of the residues kept. It cuts proportionally across every sound,
so it strands nothing. Every variant here uses one to close the last
gap, and `plan.csv` says which.

## Why coverage is checked and not assumed

A rule that refuses a family at a slot can, stacked with two others,
leave some sound with nowhere left to go. That would be the same as
dropping it while claiming not to. So **every candidate is checked for
coverage before it is reported**: all 22 consonants, all 5 vowels, and
every pool member has to turn up in an actual word. Eight of the
thirteen hits failed that check and are not here.

## Rebuilding

```bash
pnpm --dir deck/tune exec tsx make/v4/code/whole.ts
```

It runs in about half a second. The search decomposes per shape,
because a rule touches one shape and the three never interact, and the
counting is done on integers by `tally` in `plan.ts` rather than by
building words. `run` checks `tally` against the built list every time,
so the fast path cannot drift from the slow one.
