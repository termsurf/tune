# The frozen words

`frozen.csv` is **tier 0**: words that never move, under any proposal,
for any score. Sorted in the same tone order as `base.csv`.

Nothing may displace one of these. A search that wants a frozen form
must take a different form, and a proposal that moves one is rejected
before it is scored rather than after. They are the boundary conditions
the rest of the lexicon is fitted around.

**95 words, which is a domain freeze rather than a list of axioms.**

## Why it is this big

Two decisions, taken on 2026-09-15.

**The named words.** `zus` experience, `gad` god, `dip` tree, `mix`
network, `list` list, `kiq` action, `kaq` object. Each said outright.

**The math and code domain**, which was confirmed to be a domain rather
than the six words that happened to get named. So everything Tune uses
to write mathematics or a program is here: the data structures, the
control flow, the numeric types, the geometry, the axes, the trig.

```text
CONTROL    kiz if     cam then    fos else    wal while
           xuv return kar call    kix process
DATA       list rex array   sutx set   zip graph   krag node
           padj edge  dip tree  niz nest  lum branch  leC point
TYPE       tuq type   dis number  hoz cardinal  hov floating
           vic bit    veb byte   val value   vod void   lam real
SHAPE      kub cube   salk circle  skar square  kurv curve
           tiz ellipse  hub/lal/koz the three axes  vov axis
MATH       dig sine   bug cosine  bad tangent  gul exponent
           kuv divide  kus constant  zaf equal  nord order
CODE       kod code   fuq function  map map   fold fold
           dus reduce  vek filter  yev sort   lup loop
           cux key    raf reference  raj range  mask mask
```

`list`, `last`, `fold`, `mask`, `grad` and `klak` are the English word
almost exactly, which is the echo rule at its limit and another reason
they should not move.

## What this does to the tier structure

[`state.md`](../../../../note/tune/pipeline/state.md) planned tier 0 at
roughly 25 words. It is 95, and that is a better outcome than it looks.

**A frozen domain is worth far more to the search than 25 scattered
axioms**, because the frozen words are clustered in meaning. The
optimizer gets a whole region of the semantic graph held fixed, which
anchors everything adjacent to it, instead of 25 isolated pins that
constrain almost nothing.

| tier | what | count | may move |
| ---: | :--- | ---: | :--- |
| 0 | `frozen.csv` | 95 | never |
| 1 | the rest of the assigned in `base.csv` | 1,172 | only by a proposal that beats its displacement cost, and a human approves |
| 4 | the empty forms | 2,829 | freely |

## Judgment calls, which are mine and not yours

**Included, arguably general rather than technical:** `bes` base, `sut`
store, `kar` call, `pop` property, `mod` mode, `giz` position, `toz`
position (cardinal), `skal` scale, `skor` score, `reqk` rank, `fret`
frame, `nord` order.

**Left out, arguably technical:** `dom` state, `tip` step, `hap` event,
`tet` signal, `huv` handle, `guj` memory, `mab` source, `kan` aggregate,
`nub` separate, `wux` system was included but `xin` machine and `wux`
system are a pair worth checking, `dat` word, `tod` term, `nam` name,
`tox` text, `rin` run, `hip` group, `vat` body, `lif` leaf, `rol` cycle
was included.

**Move any of these either way and I will redo the file.** The line I
drew was "would it appear in a program or a proof", and that line has
real cases on both sides of it.

## One asymmetry worth fixing

```text
rot   false
---   true
```

**`false` has a word and `true` does not.** For a language whose code
vocabulary is being frozen, that is a hole in the most basic pair there
is, and it is the same kind of gap as the missing `nine`, `ten` and
`thirteen`. Flagged, not filled.

## `kiq` and `kaq` are a pattern, not two words

They differ only in the vowel, on the cross: `i` is up and outward for
the action, `a` is the centre and the surface for the thing. Freezing
one without the other would break the pair.

The same holds for any frozen word that sits in a set. **Freezing a
member freezes the rule**, which is the structural debt term in
`state.md`. The three axes `hub`, `lal`, `koz` are the clearest case:
they share a vowel-free relationship that a later change to one would
have to honour in all three.

## Adding to this file

Name the meaning, not the form. The form is looked up in `base.csv` so
the two cannot disagree, and a word belongs here only when it would be
wrong for any future version of Tune to call it something else.
