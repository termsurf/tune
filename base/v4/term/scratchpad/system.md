# Scratchpad

Systems being worked out, before they go into the lexicon. The machine
readable version is [`scratchpad.csv`](scratchpad.csv).

## The six directions

**Three axes, each a two.** The place in the mouth picks the axis and
the vowel picks the direction, following the size two pattern `e o`.

| axis | pair | `e` | | `o` | |
| :--- | :--- | :--- | :--- | :--- | :--- |
| lips | `b` `p` | `bep` | left | `pob` | right |
| tip | `d` `t` | `ted` | up | `dot` | down |
| back | `g` `k` | `keg` | front | `gok` | back |

**The opposite is the word backwards with the vowel flipped.**

```text
bep  -->  reverse  -->  peb  -->  swap e/o  -->  pob
ted  -->  reverse  -->  det  -->  swap e/o  -->  dot
keg  -->  reverse  -->  gek  -->  swap e/o  -->  gok
```

That holds for all three pairs with no exception, which is what makes
it a rule rather than six words.

This settles the question [`../system/6.md`](../system/6.md) left open.
A six can be read as two threes or three twos, and the vowel pattern
for six suits two threes. **These are three twos**, so they use the
size two pattern three times over rather than the size six pattern
once. The structure won.

## The four compass points

**Three things agree at once.** The onset, the vowel and the coda all
say the same direction, so the word is right three times over.

| | vowel on the cross | onset from `w l r y` | coda from the diamond | word |
| :--- | :--- | :--- | :--- | :--- |
| north | `i` up | `y` | `n` | `yin` |
| east | `o` right | `r` | `g` | `rog` |
| south | `u` down | `l` | `t` | `lut` |
| west | `e` left | `w` | `b` | `web` |

The coda comes from a little diamond of its own:

```text
      n
   b     g
      t
```

The onsets are the glide row `w l r y` read from the layout, mapped so
that west takes the leftmost and north the rightmost.

```text
w   l   r   y
W   S   E   N
```

**And the vowels are exactly the size four pattern**, `i o u e`, which
is the rotation around the cross. Said in order, north east south west
goes clockwise on the vowels and clockwise on the compass at the same
time.

## Colours

Six hues and three shades, both still wanting words.

**Six hues**, on the size six pattern `i a u e a o`:

| | vowel | word |
| :--- | :--- | :--- |
| red | `i` | |
| orange | `a` | |
| yellow | `u` | |
| green | `e` | |
| blue | `a` | |
| violet | `o` | |

Note the pattern puts `a` on orange and blue, positions 2 and 5, which
splits the six into `red orange yellow` and `green blue violet`. Warm
then cool, and the vowel says so.

**Three shades**, on the size three pattern `i a u`, keyed to `b w g`:

| | vowel | word |
| :--- | :--- | :--- |
| white | `i` | |
| grey | `a` | |
| black | `u` | |

**White takes `i` and black takes `u`, not the other way round.** `i` is
the top of the cross and carries the light, the hot, the outer. `u` is
the bottom and carries the dark, the cold, the inner. Putting black on
`i` would have the vowel saying the opposite of the word.

Grey takes `a`, the centre, which is right twice over: it is the middle
of the two and the only one of the three that is a mixture.

**Light and dark for the musical scale** is noted as wanting a system
and does not have one yet. If each hue gets a light and a dark form
that is twelve, and twelve has a pattern.

## What has to happen to the lexicon

Four of these ten words are legal v4 words that the 4:7:5 picker did
not select, and one collides with a number already assigned.

| word | state |
| :--- | :--- |
| `bep` `pob` `ted` `keg` `lut` | in the system, no meaning, free to take |
| `dot` `gok` `yin` `web` | legal v4, **not picked**, must be added |
| `rog` | in the system, **already means thirteen** |

**The four that need adding are the same problem as the 478.** The
picker chooses by sound frequency and has no idea which words a system
wants. `keep.ts` already takes a required set for exactly this reason,
and these belong in it.

**`rog` is a real collision and wants a decision.** Either east takes
another word, or thirteen does. Thirteen is one of the fourteen numbers
in [`list.csv`](list.csv), and the numbers are the more load bearing
set, since 4,096 is 16 × 16 × 16 and the numbers name every word in the
language.

So east probably moves, unless the compass rule is worth more than
keeping thirteen where it is.
