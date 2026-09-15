# Words that must be three letters

Carried over from `make/v3.2/words.md`. **261 concepts**, and the claim
is that each one has to be a `CVC`, not a four letter word.

The machine readable version with what each currently holds is
[`must.csv`](must.csv).

## Why three letters

These are the concepts everything else is said with: `exist`, `thing`,
`part`, `whole`, `cause`, `before`, `more`, `less`, `true`, `false`.
They turn up inside definitions of other words, and inside compounds,
and in nearly every sentence.

**A word used constantly should be short.** That is not a preference,
it is what every natural language does on its own given enough time,
and a constructed one can simply start there.

Three letters is also the only shape with room. `CVC` has 1,024 slots
in the 4:7:5 system, against 261 concepts here, so the whole list fits
with room to spare.

## Where it stands

| | |
| ---: | :--- |
| 261 | concepts on the list |
| 136 | have a word |
| **104** | **are three letters, as they must be** |
| **32** | **have a word that is four letters** |
| 125 | have no word at all |

And the room available:

| | |
| ---: | :--- |
| 1,024 | `CVC` words in the system |
| 648 | already carry a meaning |
| **376** | **free** |

**376 free against 157 that need one**, counting the 125 with nothing
and the 32 that need moving. It fits, with 219 `CVC` words left over.

## The 32 that are the wrong shape

Each of these is on the must-be-three-letters list and currently holds a
four letter word. Either the word moves to a `CVC`, or the concept comes
off the list.

```text
entity  vutx      feature sarz      cross   kras      part    part
edge    padj      image   madj      direction drix    node    krag
order   nord      open    zark      close   kloz      certain sart
boundary bund     enter   droz      exit    zord      accept  kedj
reject  djek      mix     miks      any     nark      surface sorf
perpendicular parp maximum maks     minimum skim      risk    risk
safe    stef      plan    plan      complex fluz      simple  briz
teach   titx      east    dart
```

Some are worth arguing about rather than moving. `part`, `risk` and
`plan` are the English words unchanged, which is a strong reason to keep
them even at four letters. `mix` at `miks` is the English sound exactly.

**`east` is a live collision.** It holds `dart` here and the compass in
[`scratchpad.md`](scratchpad.md) wants `rog` for it. One of the two has
to go, and the compass has a rule behind it while `dart` does not.

## Two things the list says that v4 no longer supports

**"12 numbers, mapping to 12 colours and 12 musical notes, in 5-letter
words."** v4 has no five letter shape. It is `CVC`, `CVCC` and `CCVC`
only, so a five letter word cannot exist.

The numbers also moved from twelve to sixteen, because 4,096 is
16 × 16 × 16 and three numbers name any word in the language. Fourteen
of the sixteen are in [`list.csv`](list.csv) and all fourteen are
`CVC`.

So the twelve-numbers idea is superseded twice over. **What survives of
it is the pairing**: twelve colours and twelve notes is still a good
thought, and twelve has a vowel pattern in
[`../system/12.md`](../system/12.md).

## How to work through it

`must.csv` has a row per concept with the word it currently holds, its
shape, and any note from the original outline.

**Sort by the empty ones and fill them.** 125 concepts have no word and
376 `CVC` slots are free, so every one can be given a short word without
displacing anything.

**Then decide the 32.** For each, either move it to a free `CVC` or take
it off the list with a reason.

The method for picking each word is in
[`note/tune/readme.md`](../../../../../note/tune/readme.md). These are
mostly standalone concepts rather than sets, so most of them want to be
picked by feel and checked against
[`../system/sound.md`](../system/sound.md), not derived from a pattern.

## The derived section

The tail of the original list is marked `# derived concepts`, and those
are explicitly **not** base words. They are compounds:

```text
pleasure  = positive experience       good = positive effect
peace     = neutral  experience       bad  = negative effect
pain      = negative experience
teach     = send knowledge            learn = receive knowledge
emit      = send out                  absorb = receive in
breath    = flow loop
```

These want no word of their own. They are what the base words are for,
and each one being sayable from parts is the evidence that the base set
is doing its job.
