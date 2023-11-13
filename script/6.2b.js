
const fs = require('fs')
const consonants = `mnqgdbptkhsfvxrlwyzjcC`
const processor = require('./4.new')
const trie = processor.createTrie()
const possibleWords = []
const vowels = `aeiou`
const starts = `
br
bl
dr
dj
cr
fr
fl
gr
gl
kr
kl
pr
sr
sl
tr
tx
vl
vr
xl
`.trim().split(/\n/)
const ends = `
ldj
rfk
lft
rnd
rnz
mdz
rzd
rsk
rsp
rst
rtx
rks
rgz
rbz
rps
ltx
lts
lps
`.trim().split(/\n/)

let words = []

let i1 = 0
l1:
while (i1 < starts.length) {
  let x1 = starts[i1++]
  let i2 = 0
  l2:
  while (i2 < vowels.length) {
    let x2 = vowels[i2++]
    let i3 = 0
    l3:
    while (i3 < ends.length) {
      let x3 = ends[i3++]
      if (x2.match(/[ie]/) && x3.match(/^[lr]/)) {
        continue l3
      }
      const word = `${x1}${x2}${x3}`
      if (word.match('r.r')) continue l3
      words.push(word)
    }
  }
}

words.sort()

words.forEach(word => {
  processor.addIfPossible(trie, word, 'ccvcc')
})

words = processor.collect(trie)

fs.writeFileSync('inspiration/word/6-c-c-v-c-c-c/full.csv', shuffleArray(words).join('\n'))

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array
}
