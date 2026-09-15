# Tune: The Base Constructor System

**These are the most used words in the language**, because a constructor
appears as the second or third word of a thousand other terms. Every one
of them wants to be three letters, and 93 of the 104 already are.

[`build.csv`](build.csv) is the list with what each one currently holds.

| | |
| ---: | :--- |
| 104 | constructors, plus 3 that are phrases rather than words |
| 93 | are three letters |
| 11 | are four |
| 60 | already carry a meaning in the lexicon |
| 19 | are in the system and free to take |
| 19 | are legal but were not picked, so want adding |
| **9** | **are not legal v4 words at all** |

## Six of them die to one rule

Four constructors and two of the symmetric words in
[`scratchpad/action.md`](scratchpad/action.md) are killed by the same
thing: **a liquid closes only on `a` or `o`**, so `il` `el` `ir` `er`
`ul` `ur` are banned endings.

```text
tul   it is a tool          ul
gul   that                  ul
zir   pertaining to x       ir
fir   hating, fearing       ir
jil   stream                il
jul   jewel                 ul
```

That rule earns its keep: `bil` really cannot be held apart from `bi`.
But it is now known to have cost six words that other parts of the
design specifically want, and **`-ir` and `-ul` are exactly the shapes a
suffix-like constructor keeps reaching for**. That is not a coincidence,
it is the rule and the morphology wanting the same sounds.

Worth deciding deliberately rather than one word at a time. Either the
rule stands and these six find other words, or the rule is narrowed.
The `u` half is the newer half, added on the argument that a rounded
back vowel and a liquid share a tongue gesture, so `ul` and `ur` are the
easier two to reconsider.

The other three failures are ordinary and want no rule change:

```text
byas   possessive plural    `by` is not a listed opening cluster
marC   quite                `rC` is not a listed closing cluster
```

And `yas lig`, `yas gul` and `haj vol` are phrases, not single roots, so
they are counted separately above.

## What this note is

The closed set of short roots that Tune uses to build every other
concept, read off the live `tune.surf` site rather than from memory.

Source: `cluesurfshed/tune.surf` at `pages/`, cloned to
`land/code/github.com/cluesurfshed/tune.surf/`. 39 content pages, 3,357
lines. The vocabulary those pages draw on is
`configurations/term.yaml` (5,271 entries) and
`configurations/terms.csv` (3,951 entries, each with its source
language).

This maps the **constructors**: the roots that appear as the second or
third word of a thousand other terms. It is not a vocabulary list. The
vocabulary is the two files above, and
[`old-tune-documentation.md`](old-tune-documentation.md) covers the
ontology and the values.

## The four layers

A Tune concept is built in four moves, each strictly smaller than the
one below it.

```
27 sounds          22 consonants + 5 vowels, laid into a 3x3x3 cube
  |
5 spirit endings   -i -a -e -o -u, one per word class
  |
~3,900 roots       CVC or CVCVC, borrowed from 15 languages
  |
79 constructors    the roots that build other concepts
```

Everything below is layer four, with layers one through three stated
only as far as the constructors need them.

### Layer one: the 27 sounds

22 consonants and 5 vowels, the same count as the Hebrew alphabet and
the same count as the blocks of a 3x3x3 cube. The cube is the ordering,
front layer lowest:

```
front       middle      back
i  e  a     d  b  p     z  j  x
o  u  m     t  k  h     c  C  w
n  q  g     s  f  v     l  r  y
```

Gematria runs ones, tens, hundreds, to a maximum of 900:
`i`=1 through `u`=5, `m`=6 through `g`=9, `d`=10 through `v`=90,
`z`=100 through `y`=900.

Word formation rules from `/rule/word`: a root starts and ends with a
consonant, never ends in `h`, `y` or `w`, never starts with `q`, never
has two vowels in a row, and `h` never touches another consonant. `x` is
English `sh`, `tx` is `ch`, `dj` is `j`, `c` is the `th` of "theory",
`C` is the `th` of "these", and `j` is the `s` of "measure".

### Layer two: the five spirit endings

One vowel on a bare root picks the word class. This is the whole
grammar, and it derives from the ontology: experience splits into action
and object, and the other three are an optimization on top.

| # | class | type word | ending | what it does |
| :-- | :--- | :--- | :--- | :--- |
| 1 | action | `kiq` | `-i` | changes things in the conversation |
| 2 | manner | `teq` | `-e` | the way an action is performed |
| 3 | object | `kaq` | `-a` | the things, tangible or not |
| 4 | design | `toq` | `-o` | the features of things |
| 5 | cradle | `kuq` | `-u` | orients speaker and listener in the flow |

The ending is dropped on any word that precedes its head, because word
order already says what it is. Only the head of a phrase carries a
suffix. That single rule is why the constructors are written bare in
every table below.

`-wa` is a sixth ending, used only for formal objects. Atoms take it:
`tom sloCwa` is hydrogen as a substance rather than as a word.

### Layer three: the roots

3,951 roots carry a recorded source language:

| source | roots |
| :--- | ---: |
| hebrew | 1,163 |
| chinese | 988 |
| english | 517 |
| unrecorded | 469 |
| sanskrit | 343 |
| arabic | 246 |
| icelandic | 63 |
| inuktitut | 42 |
| french | 29 |
| swahili | 26 |
| latin | 21 |
| japanese | 16 |
| tibetan | 12 |
| greek | 9 |
| spanish | 3 |

By class: 2,178 objects, 1,081 actions, 692 manners.

## Layer four: the constructors

`/term/design` carries the main table: **80 rows, 79 distinct roots**
(`mis` is listed twice, once as "most" and once as "different"). They
group into eleven jobs. The groupings are this note's, not the page's.
The page prints them as one flat list.

### A. Tense and aspect

| tone | meaning |
| :--- | :--- |
| `yod` | past tense, "created" |
| `pot` | complete state, the `-ed` you enter into |
| `reC` | progressive `-ing` |
| `gut` | gerund, the state of an action |
| `kif` | future tense, "will create" |

`/rule/action` uses a different set for the same jobs. See
[the drift table](#where-the-pages-disagree).

### B. Possession and number

| tone | meaning |
| :--- | :--- |
| `bak` | possessive, "the bird's food" |
| `byas` | possessive plural, "the birds' food" |
| `yas` | plural marker, placed before the noun |

`bak` is the single most used constructor on the site.

### C. Nominalizers, which say what KIND of thing the result is

This is the group English collapses into `-tion` and `-ness` and which
Tune refuses to collapse. Each one names a different kind of result.

| tone | meaning |
| :--- | :--- |
| `hap` | x event |
| `gem` | x game |
| `kix` | x process |
| `wux` | x system |
| `fos` | x force |
| `ses` | x essence |
| `van` | x nature, `-ivity` `-ity` `-ance` |
| `dom` | state of being, `-dom` |
| `dax` | the state of being x, `-acy` `-ness` `-ship` |
| `nal` | period of x, `-hood` |
| `gin` | the nature of doing x, `-ence` |
| `mox` | the model of the action, "the transform" |
| `kos` | disease, `-osis` |
| `sox` | x society |
| `gar` | language, `-ese` |
| `ciq` | thing, as in "hatchling" |
| `tak` | result, from `/rule/object` |

`/rule/cradle` states the reason out loud: English `-tion` means "result
of x" and also "x process" and also "x event", so Tune gives each one
its own word.

Worked from `/term/object`. Evolution is `valv kix` (evolve process),
exception is `Coz tak` (except result), existence is `wav dom` (exist
state), expertise is `zandjam dom`, infection is `ganran tak`, formation
is `form tak`.

### D. Person and role

| tone | meaning |
| :--- | :--- |
| `zek` | one who does x, `-er` `-or` |
| `koz` | one who receives x |
| `vol` | the one, used for figures |
| `dik` | maker |
| `nar` | person |
| `tul` | it is a tool, as in "zipper" |

`zek` is the third most used constructor. `rasam zeka` is a painter,
`bram zeka` a creator, `cetx zek` a dentist (tooth agent), `not tek zek`
a secretary (note taker), `malk frix zek bord` a kingfisher.

### E. Resemblance and orientation

| tone | meaning |
| :--- | :--- |
| `lak` | x like |
| `hip` | emanating x |
| `lij` | x oriented |
| `yip` | resembling, `-istic` |
| `rav` | reminiscent of, `-esque` |
| `nix` | having some aspects of, `-ish` |
| `xit` | shaped |
| `mon` | featuring x |
| `tof` | relates to, "affectional" |
| `fom` | formal x |

This group is where English `-y` and `-ly` and `-ous` land, and where
the site disagrees with itself most sharply. Three incompatible spellings
of the same three relations appear on three pages:

| relation | `/term/design` table | `/term/design` examples | `/rule/design` prose |
| :--- | :--- | :--- | :--- |
| like | `lak` | `teq` | `muz` |
| emanating | `hip` | `wug` | `net` |
| oriented | `lij` | `ruz` | not stated |
| inducing | not listed | `zor` | `zor` |

### F. Belief and study

| tone | meaning |
| :--- | :--- |
| `yog` | practice of focusing on x, `-ism` |
| `fin` | belief in x |
| `ved` | study or science of, `-ology` |
| `zir` | pertaining to x |

`/term/vibe` is the cleanest demonstration of the whole system, 15 rows
built from four roots and three constructors:

```
djud zek   jew          praised agent
djud lij   jewish       praised oriented
djud yog   judaism      praised practice
bud zek    buddhist     awakened person
bud yog    buddhism     awakened practice
bud vol    buddha       awakened one
krist vol  jesus christ anointed one
slim yog   islam        submitted practice
```

A religion, its adherent, its adjective and its founder are one root
plus one constructor each.

### G. Quantity and degree

| tone | meaning |
| :--- | :--- |
| `fol` | full of, `-ful` |
| `lef` | less of, `-less` |
| `taz` | very much of, `-some` |
| `leg` | containing |
| `mor` | more, `-er` |
| `mis` | most, `-est` |
| `tub` | over, "overburden" |

Comparatives are analytic. `mor tov` is better (more good), `mis tov` is
best, `mol nic` is tall (high long).

### H. Ability

| tone | meaning |
| :--- | :--- |
| `kan` | capable of being, `-able` |
| `kin` | ability, `-ability` |
| `kun` | `-ableness` |

`kraf kan` is comfortable, `hawal kanu` is convertible, `meg kuna` is
maintainableness.

### I. Operators, which sit in front of the root

| tone | meaning |
| :--- | :--- |
| `huf` | opposite, `anti-` |
| `baq` | self, `auto-` |
| `pak` | undo |
| `sup` | exceed, `super-` |
| `mex` | mesh, `inter-` |
| `sem` | same, `sym-` |
| `vav` | repeat |
| `zig` | equal, `iso-` |
| `dit` | distance, `tele-` |
| `gen` | again, `re-` |
| `rup` | partial, `semi-` |
| `sud` | somewhat, `pseudo-` |
| `mad` | thing about the thing, `meta-` |
| `djen` | x generating |
| `len` | general, the infinitive "to" |
| `laz` | `-ize` |
| `fir` | hating or fearing or resisting, `-phobia` |
| `mis` | different |

### J. Deixis and stance

| tone | meaning |
| :--- | :--- |
| `fut` | there |
| `dav` | here |
| `vak` | ever |
| `ples` | place x |
| `land` | land x |
| `drit` | right, as in "right now" |
| `fit` | right, as in correct |
| `yov` | consequence |
| `did` | indeed |
| `prab` | probable |

### K. Size, age and colour, the taxonomy workhorses

Not on the design page, but these carry the whole formal-naming layer in
`/term/object`, the site's largest table at 181 rows.

| tone | meaning |
| :--- | :--- |
| `brat` | large |
| `smal` | small |
| `nuc` | long |
| `txab` | little |
| `har` | early |
| `xant` | ancient |
| `gum` | new |
| `mig` | old |
| `veg` | black |

Every one of these is an ordinary content root doing constructor duty.
That is the point of the system: nothing is a grammatical particle,
everything is a word.

```
brat maqk        gorilla        large monkey
veg maqk         chimpanzee     black monkey
smal veg maqk    bonobo         small black monkey
gum bal maqk     new world monkey
mig bal maqk     old world monkey
brat kwik kat    leopard        large quick cat
smal kwik kat    cheetah        small quick cat
strip kat        tiger          striped cat
veg korvid       crow           black corvid
brat veg korvid  raven          large black corvid
bul korvid       blue jay       blue corvid
tul dam          homo habilis   tool human
stand dam        homo erectus   stand human
cros dam         homo sapiens   art human
```

The naming budget is stated on the page: three words for a formal noun
phrase, four or more only where a science needs an identifier.

### L. Determiners

16 rows at the head of `/term/design`.

| tone | meaning |
| :--- | :--- |
| `kol` | all |
| `dan` | the |
| `nif` | a |
| `lig` | this |
| `gul` | that |
| `yas lig` | these |
| `yas gul` | those |
| `haj vol` | everyone |
| `fid` | next |
| `daf` | previous |
| `lam` | low |
| `mol` | high |
| `ven` | even |
| `sin` | soon |
| `marC` | quite |
| `hej` | every, each |

A determiner takes exactly one argument, the word after it, so it never
carries an ending.

### M. Cradles, the relational layer

`/term/cradle` holds 83 rows: 51 prepositions and 32 logical
combinators. Cradles are an open class, which the page flags as unusual.
New ones are made by taking any action or object root and adding `-u`.

Each preposition is given in four columns at once, which is the design
the rest of the language rests on. One root, four readings:

```
tone   cradle    action             object        design
ras    in        enter              inside        inner
sur    out       exit               outside       outer
sok    around    surround           boundary      boundaried
bis    across    cross              cross         crossed
cum    through   tunnel             tunnel        tunneled
xul    except    subtract           subtraction   subtracted
lax    plus      add                addition      added
nul    toward    decrease distance  ...
lan    away      increase distance  ...
```

The logic set is plucked from content roots the same way. `kon` (and)
comes from intersect, `cor` (or) from unite, `nun` (not) from negate,
`hid` (but) from contrast, `zag` (because) from reason, `kit` (if) from
test.

## How a concept is built

The chain is root, then constructors, read left to right, head last.
From `/rule/design`:

```
bram                   creation
bram yog               creationism
bram yog zek           creationist
yas bram yog zek       creationists
bak bram yog zek       creationist's
bak yas bram yog zek   creationists'
sup bram               created (past)
dax bram               created (state)
reC bram               creating
wid bram               will create
```

Longer chains work the same way, no different mechanism:

```
mek kix rahas          mystification    the make-mystery process
van yum nod            centrality       the nature of centralness
samlar zor muz         shockingly       shock inducing like
hasom taz              awesome          awe very-much-of
```

And a full formal name, from `/term/object`:

```
Big   Owl    -Eyed     Night -Walk  -er
brat  yanxuf leg nayan nit   wak   zeka
```

## Which constructors do the work

Occurrences of each constructor across all page text, ranked. Each count
includes the two occurrences from the root's own defining table row, so
treat three as the floor and read the ordering rather than the absolute
number.

```
bak  45    zek  27    kix  16    mor  13    lij  10
sup  42    brat 23    pot  14    tub  12    fol   9
reC  37    yog  19    laz  14    yod  11    smal  8
           leg  18                mis  11   land   8
                                  lef  11
```

Possession, tense, agent and size are what the language actually spends
its breath on.

## Coverage: what the dictionary carries

Of the 79 distinct constructors on `/term/design`:

| | count |
| :--- | ---: |
| in `term.yaml` | 32 of 79 |
| in `terms.csv` | 60 of 79 |
| in neither file | 12 of 79 |

The 12 that appear on the page and in no dictionary file:

```
djen  fir  fom  gut  huf  kan  kos  kun  lef  len  mor  xit
```

`kan`, `kun`, `lef` and `mor` are among the most used roots on the site,
so the gap is in the data files rather than in the design.

## Where the pages disagree

Every row here was checked against `configurations/term.yaml` and
`configurations/terms.csv` directly. These are real conflicts in the
source, not transcription slips, and any rebuild has to settle them.

| tone | `/term/design` says | elsewhere says |
| :--- | :--- | :--- |
| `yod` | past tense `-ed` | `terms.csv`: sort. `/rule/action` marks past with `sup` |
| `sup` | exceed, `super-` | `/rule/action`: the simple-past marker. `/term/cradle`: above |
| `vak` | ever | `term.yaml` and `/term/math`: multiply. `/term/manner` has `vuk` for ever |
| `mad` | `meta-` | `term.yaml`: positive. `/rule/speech` uses `mad doma` for positivity |
| `laz` | `-ize` | `term.yaml`: very much of, which the same page assigns to `taz` |
| `koz` | one who receives x | `term.yaml`: z-axis |
| `hip` | emanating x | `term.yaml` and `/term/computation`: group |
| `rav` | reminiscent of | `term.yaml` and `terms.csv`: particle |
| `fut` | there | `/term/direction`: right |
| `leg` | containing | `/term/direction`: start |
| `dit` | distance, `tele-` | `terms.csv`: datetime stamp |
| `rup` | partial, `semi-` | `/term/math`: logarithm |
| `lig` | this | `term.yaml`: square root |
| `ruz` | oriented, in the examples | `term.yaml` and `/term/number`: thirteen |
| `mis` | most, and also different | two rows of the same table |
| `nif` | a | `/term/object` and `/rule/design` use `nic` for the same job |

Two more sit inside the math page alone. `term.yaml` gives `lig` for
square root and `gul` for exponent, while `/term/math` gives `lug` and
`gal`, and `terms.csv` gives `lug` for logarithm where `/term/math`
gives `rup`.

## What to inherit

The constructor system is the part of Tune worth carrying forward
unchanged, for three reasons that hold independently of any particular
root.

**One root does four jobs, and the jobs are written down.** A cradle row
gives the preposition, the action, the object and the design together.
`ras` is in, enter, inside and inner. Nothing is a separate grammatical
particle, so the lexicon never splits into content words and function
words.

**English suffixes are decomposed rather than translated.** Seventeen
different nominalizers stand where English has `-tion` and `-ness`, and
the site says why: `-tion` means result, process and event, and a
language that cannot tell them apart is wrong in three ways at once.
The same holds for the like, emanating, oriented and inducing split
under `-y` and `-ly`.

**A name is a short chain, not a lookup.** A gorilla is a large monkey,
a creationist is creation plus practice plus agent, hydrogen is water
plus the formal-object ending. The 181 formal names on `/term/object`
use roughly nine size and age modifiers between them.

What must not be inherited without a decision is the root assignment.
Sixteen of the 79 constructors collide with a different meaning on
another page, and twelve are absent from the dictionary entirely. The
design survives all of it. The specific spellings do not.

## Related

- [`old-tune-documentation.md`](old-tune-documentation.md), the ontology
  and values behind the same pages
- [`the-model.md`](the-model.md), experience, tone, link, beat, mesh
- [`english-suffixes.md`](english-suffixes.md), the English side of the
  nominalizer problem
- [`base-terms-derived.md`](base-terms-derived.md), the 64 base roots
  derived from sound meanings
- [`ontology-map.md`](ontology-map.md), the domain map the terms cover
