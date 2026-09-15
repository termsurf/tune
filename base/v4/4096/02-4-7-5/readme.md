# 4:7:5 = 16

**The one leaned toward.** 
```text
CVC   1024
CVCC  1792
CCVC  1280
      4096 = 2^12, so a base word is twelve bits
```

How each shape reaches its number:

- **CVC** at 1024: p, t and k open a quarter of the words they could; a voiceless stop closes a three letter word half the time; an even sieve keeping 4 of 6
- **CVCC** at 1792: a hush or a tooth sound opens a word closing on a cluster half the time; a liquid stands first in a closing cluster half the time; a voiceless stop stands last in a closing cluster three quarters of the time
- **CCVC** at 1280: a hush or a tooth sound stands second in an opening cluster three quarters of the time; a voiceless stop closes a word opening on a cluster a quarter of the time; an even sieve keeping 4 of 5

## What the words mean

**A ratio, never a ban.** Nothing here says a sound may not stand
somewhere. A rule like "c or C opens a quarter of the words they
could" leaves `c` and `C` free everywhere else, and free in that
slot too, just less often. The whole inventory survives and every
sound reaches a word.

**A sieve is an even thinning.** Every sound has a fixed number,
its place in the tone order from `code/phonology.ts`. Add up the
numbers of a word's sounds and divide by some small number, and
the remainder is what the sieve reads. "Keeping 4 of 5" means a
word stays when that remainder is 0, 1, 2 or 3, and goes when it
is 4, so four words in five survive.

It is there because rules about sounds land on round-ish numbers
and rarely on the exact one wanted. The sieve closes the last gap
without favouring any sound, because the remainder has nothing to
do with which sounds a word holds. Every opening, closing and
cluster loses the same share.

**Nothing is random.** The remainder is a property of the word
itself, so the same word is kept or dropped on every run, on any
machine. Rebuilding gives the identical list.

**No echo rule is used.** That rule refuses a word opening and
closing on the same or a similar consonant, and it would cost
`mam`, `pap`, `tat` and `dad`, which are words a language cannot
do without.

After the closeness pass, 808 words stay distinct.

Rebuild with `pnpm --dir deck/tune exec tsx make/v4/code/ratio.ts`.
