
# Welcome to the Tune Language

Thank you for wanting to contribute to the Tune language! All your effort and help with the project is very much so appreciated, and will help us reach the goal of translating the first 1 million words into Tune.

## Background

First, this project was started out of curiosity of how regular "natural" languages work, and wanting to find a way for a computer to understand a language like English. Well after many years of thinking about this and pondering the problem, it still seems very hard to handle English. However, what if we created our own language that had more sharply and clearly defined rules, that was more "structured" as well so a computer could understand it? (But at the same time you could speak it, too). That is the spark of the interest that led to Tune being created.

Basically the goal with Tune is to take _all_ of the English words (and words from other cultures, religions, sciences, fields, etc.), and convert them into a standard form. In the end, we will have all of the concepts classified into one system that isn't polluted by centuries of tinkering around and patching the English language with different features and such. English is full of words derived from Latin and Greek, but also other languages, and it is very complex. Especially for things like the biological species name (in the biological taxonomy), or chemical names, particle names, rock names, places on earth, etc. We would like to redo all these things and come up with a central system for the whole thing. If for no other reason than it would make it easier for a computer to understand the meaning of different words and concepts.

## Goal

So what we are doing, first and foremost, is capturing the simplest, most fundamental words first, and making those 1 syllable within Tune so they are easy to pronounce. In an ideal world, these are the first words you would teach a child or young student. Up until around the first 5,000 words or so (as that is how many words we can easily create using the patterns and systems we've landed on for word formation, and that is about how many words we could collect on the web efficiently, based on many lists of 100 to 1000 common words). So we have collected 5,000 or so English words _in their base form_, meaning, given the words "create", "created", and "creating", the base form is "create". So we have 5,000 words like "create" which are in their base form, and have single-syllable Tune words associated with them for ease of use.

The first goal, is to take these 5000 words, and to figure out the part of speech of them (verb, noun, etc.), and to take the base Tune word and complete it so it correctly reflects the English word's part of speech. This will give us a list of 5,000 1-syllable words, with proper translations into Tune.

Another goal is to build on these 5,000 words by finding word _derivations_. That is, finding the words like "created" and "creating" (and many others like "creation", etc.), which will greatly explode the size of our word list (lexicon). You can say there are on average 5-10 derivations of a word, so given we have 5,000 base words, that is anywhere from 25,000-50,000 different words! And for each of these derivations, we need a specific Tune translation. That is no easy task, and will take the contribution efforts of many people over a long period of time, especially to make it a good list to learn from. Well it turns out, the average high-school graduate is said to know about 50,000 words, so that would be just the right amount. But we aren't sure if that means 50k "base" words, or 50k words in general. If it's 50k base words, then we have much more to go!

That leads us to another goal, to collect 1 million "terms". That is an extremely long term goal that will probably take many many years. But a "term" means either a single word (which can be a "compound" word, composed of many sub-word parts), or multiple words (like "Radio Show Host"). We want to collect as many of these terms as we can so it comes up to par in breadth and depth of scope to a natural language like English. We can use Wikipedia as our guide here, on which terms to translate, along with all their "glossaries" in different academic fields.

A related goal is to translate many standard terminology sets into Tune, such as the biological taxonomy previously mentioned, the chemical names, atom names, tool and technology names, and jargon from specific academic fields. We aren't just going to necessarily directly translate each word part-by-part (using the Latin/Greek affixes, for example), into Tune, but we can do that if it makes sense. Instead, we will try and use those as inspiration for coming up with an even simpler jargon for whatever industry or topic we are focusing on.

So those are the main goals, first building a relatively small and high quality word list which will work with children, and then expanding it to include as many terms as possible. The first 5,000 or so words will be 1-syllable extremely simple words and concepts. Then we have room for 130,000+ words, written as two-syllable 5-letter words, following the pattern c-v-c-v-c (consonant, vowel). In total, these 135,000+ possible words should/will represent _fundamental_ concepts which are hard to break down any further efficiently/usefully, with the 5,000-ish 1-syllable words being the simplest of the group. Then we will have room to create potentially millions of compound words which are derived from these fundamental building blocks.

## How You Can Help

Now we can get into the details a little bit of how you can help translating words into Tune.

The first major thing that can be done is collecting words in their "base" form. This can be done by browsing dictionaries, or finding word lists (though we have already found most word lists on the web we could and filtered through them to find the best ones), or thinking of words you already know (though it's hard to tell what we _don't_ have haha). Another place to look for words is in specific industries (like you'll find the word "tensor" used in physics, but hardly anywhere else). If you find any words, even just one, feel free to create a pull request on GitHub for this project, or work with us however is easiest for you and we can get them integrated into this GitHub project (which is freely available under the Apache license for now).

The second thing that can be done is to find word derivations based on these base forms, as we previously described. Several tools on the web already provide word derivations for you, so sometimes its as easy as just doing a search and harvesting the results. Other times it's less obvious and things may have to be done by hand.

Those two tasks are focusing on English word collection and curation. You can gather words from other languages as it makes sense, as some languages have words for things which English doesn't have a word for. However, we don't want to duplicate the effort as of now in collecting words from every language, we'll save that for a separate project. So this project is mainly focused on "concept" collecting in the more general sense, most of which are in English words already, but some of which may be in other languages.

The third thing that you could quickly help with is taking the initial Tune words which we have provided along with each base word, and writing the Tune word so it matches the English word's part of speech. Or you can take the English words for which there are no Tune words associated, and find the base word to get the base Tune word for it, and then write out the full Tune word to match the part of speech and features of the English word. See the [existing Tune words](https://github.com/drumworkteam/tune/blob/make/list/word/base.csv) for examples of parts of speech translation, like looking how we did the word "create".

The final thing you can do is to look for mistakes in the existing translations and English words we've harvested. Many word lists come with junk words, words which don't make any sense, or words that are spelled wrong. If you see any of these, please feel free to let us know, or fix them and send us the updated files, or create a GitHub PR with the associated changes. Always feel free to help contribute to this project in any way you can see fit, that's the main way we can get to where we can see in the future.

## How Tune Works

Now that you know what can be done, all that's really left is figuring out how Tune works. What are the grammatical features for word construction? That is what we will discuss in this section.

### Phonology and Writing System

First, we need to know how to actually write the words in Tune, and what sounds we can even use to make words in the first place! That is the writing system and "phonology" (sound study).

All sounds and pronunciations are written using [call script](https://github.com/drumworkteam/call), which is a system we have devised for writing the _pronunciation_ of words using only letters you have on your traditional laptop keyboard. We use only a small subset of the features of the call script in Tune, because Tune is designed as a language to only use really simple sounds, and it turns out to map nicely to call scripts lettering system. Take a look at that call script link, it describes in much more detail what call script is all about and how it works, if you are interested. However, we will give you just the pieces of it you need to know of right here as well.

Here, we will write the consonants and vowels we use in Tune, which is using call script, and will write a word next to each letter to show the key sound that the letter represents. After reading through these, you should know how to write a pronunciation using your keyboard. That is, you can write a word in Tune, which inherently includes how to pronounce it!

In Tune, there are 19 **consonants** used. They are:

- `m`: "mark"
- `n`: "note"
- `q`: the `-ng` in "sing"
- `g`: "gift"
- `d`: "deed"
- `b`: "band"
- `p`: "play"
- `t`: "time"
- `k`: "king"
- `h`: "heal"
- `s`: "soul"
- `l`: "love"
- `r`: "rat" but with spanish, arabic, or indian accent
- `w`: "wave"
- `y`: "yard"
- `z`: "zone"
- `f`: "fire"
- `v`: "vibe"
- `x`: "ship", the "sh" sound

The consonants that are missing (i.e. that Tune does not use) are things like the Hebrew/Arabic harsh "h" sound, the ejective (hard) consonants like in Georgian, the stop consonants like in Korean, or the click sounds like in some African languages. Also, we don't use the "j" sound (like in "measure"), or the "th" sound (represented as "c" in call script), either like in the word "the" or "thing".

Then we have the **vowels**. There are 5 vowels used in Tune. They are:

- `a`: "call"
- `e`: "make"
- `i`: "seat"
- `o`: "hold"
- `u`: "tool"

We have left out as many as 10 or more vowel sounds used by various other languages, focusing only on these extremely distinct vowel sounds.

In the end, we have 19 consonants and 5 vowels, for a total of 24 sounds.

## Word Formation Rules

Next we will describe the key word formation rules. First, some major things we can get out of the way up front.

- All base word forms start and end with a consonant. They are turned into nouns, verbs, adjectives, etc. by adding vowels to the end.
- Words can't end in `el` or `il` because it adds an extra syllable depending on pronunciatio style.
- Words can't end in `h`, `y`, or `w`, as these don't really make a clear audible sound to a non-native speaker.
- You can have "consonant clusters", like `str` in "string", or `pl` in "plan".
- There can only be one vowel between consonants. That is, there are not sounds like `oi` and `ao`.
- On even-syllabled words, the stress falls on the last vowel. So if it's "tenak", it would be pronounced "tenAK".
- On odd-syllabled words, the stress falls on the second to last vowel. So if the word is "tenakan", it would be pronounced "tenAKan".

So here are a few basic words:

- `bam`: create
- `dip`: tree
- `zenz`: purple

These word forms are in their "base" form. You can tell because they start and end with a consonant. As they are in their base form, they mean simultaneously they are a noun, verb, and feature (this concept is kind of difficult to grasp). But you can easily convert them to the more familiar nouns, verbs, and features (word "modifiers" like adjectives and adverbs), by adding a 1-letter suffix to the end. So we have:

- `bami`: create (verb)
- `dipa`: tree (noun)
- `zenzo`: purple-like (adjective)

That is:

- `-i` suffix creates a verb.
- `-a` suffix creates a noun.
- `-o` suffix creates an adjective or adverb.

Then we have more complex prefixes and suffixes, like we do with English. In English we have prefixes like "bi-" meaning "two" ("biweekly"), or "un-" meaning something like "not" ("unlikeable"). In English, we also have suffixes like "-tion" meaning something like "the result of applying an action" like "creation", or "or" meaning "the person or thing who performed this action" like "creator". We can do pretty much the same thing in Tune script. However, unlike in English where sometimes the base word is modified before attaching the affix (like "create" drops the "e" to make "creat" before adding the "-or" to make creator), we don't modify the base form at all in Tune. Instead, you simply add the appropriate vowel "separator", depending on if the base is being treated as an "object" (noun), "action" (verb), or "feature" (adjective/adverb), and the appropriate follow-up word. All you are doing is attaching more simpler words onto the base word, separated by vowels. That's pretty much it.

So for example, we have these:

- `bami`: "create"
- `bamiho`: "created"
- `bamiha`: "creating"
- `bamixoma`: "creation"
- `bamixomazima`: "creationism"
- `bamixomagaba`: "creationist"
- `bamixomagabaya`: "creationists"
- `bamixomaya`: "creations"
- `bamihazo`: "creative"
- `bamihazoyo`: "creatively"
- `bamihazonesa`: "creativeness (state of being creative)"
- `bamihazoxoma`: "creativity (result of being creative)"
- `bamihazoxomaya`: "creativities"
- `bamipuma`: "creator"
- `bamipumaya`: "creators"

Let's take "creativities" (`bamihazoxomaya`) for example. You can try and pronounce that word `bamihazoxomaya` by following the call script guide like we've outlined above :) That has attached `-i` to `bam` ("create" in base form), to make it a verb/action `bami`. Then we attach `hazo`, where `haz` is the base form of the word meaning "have", and we are talking about it having a _feature_, so it ends in "o". Then we attach `xomo` which has `xom` as the base word meaning "result of being x", where "x" is in this case "creative". And we suffix `xom` with `-o` since we are talking about this as if it were a feature (you can tell its a feature if it is modifying the final object or action). Finally, we append "ya", which is one of the few 2-letter words meaning "many" or "plural". So all together this is `bam i haz o xom o ya` or "create [action] have [feature] result of being x [feature] plural", or `bamihazoxomaya` (bah-mee-hah-zoh-show-MAH-ya) meaning "creativities".

Notice how on the adverbs like "creatively" (ends in "-ly"), we add `-yo`. Well basically, all words follow similar patterns. But it is not always so straightforward how to translate an English word to Tune, as English "base" words are not always nouns, sometimes they are verbs, sometimes adjectives, maybe even sometimes adverbs, or other parts of speech. Then English derives other words from those weird bases, and it gets complicated what is what. So if you have any questions on how to translate a specific word, please don't hesitate ot ask.

Oh, one more common case to note. The past tense is marked by `-ho` ("created" is `bamiho`), the currently active tense (symbolized by "-ing" in English) is marked by `-ha` ("creating" is `bamiha`), and the future tense ("will x" in English) is using `-hi` ("will create" is `bamihi`).

There are no other sorts of word "inflections" or "conjugations" like you find in Latin or Spanish or Finnish or other languages, Tune tries to be as atomic as possible, by keeping everything as separate words. However, it is nice how we are able to form longer words from Latin/Greek in English (like "hydrogen" is really "hydro" + "gen", meaning "water generating"), so Tune makes it possible to construct longer words from parts. For example, the word for "kilometer" (which is "kilo" or "thousand" plus "meter") is `kil` + `mirt` or `kilomirta`.

## Summary

So to summarize, if how the words are structured/made makes sense to you, then please, it would be of great help to write translations of words into Tune from English, using the above rules. If anything doesn't make sense to you, like it's unclear how to translate some specific case, or you have found a new case or suite of cases (phew!), please reach out so we can figure out how they should be represented in the Tune language and we can get that solved for you so you can continue on.

If there's anything we can add to this guide, or anything at all you would like to improve or tell us about, please reach out to us directly through whatever means you are most comfortable with, or through the [Conlang StackExchange](https://conlang.stackexchange.com/) or the [Conlang Facebook Group](https://www.facebook.com/groups/Conlang).

But anyways, thank you for reading this and hopefully things makes sense. Tune is pretty much solidified in terms of its word formation patterns, so we can be off to the races in building a large list of words and concepts translated into Tune. In the end, anyone is free to use the word lists for whatever purpose following the license, and even we can use this word list and translation into the more structured Tune language, to try and see if we can solve some disparate interesting problems.
