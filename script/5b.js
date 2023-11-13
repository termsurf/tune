
const fs = require('fs')
const processor = require('./4.new')
const consonants = `mngdbptkhsfvxrlwyz`
const vowels = `aeiou`

const trie = processor.createTrie()
const possibleWords = []

const starts = `
br
bl
dr
fr
fl
gr
gl
kr
kl
mw
pl
pr
sr
sp
sw
sl
sm
sn
tr
tx
tw
vr
`.trim().split(/\n/)
const ends = `
fk
ft
qk
nd
nz
mz
md
gz
zd
sk
sp
st
rd
rt
rz
rp
tx
lz
lt
lp
`.trim().split(/\n/)

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
      if (x2.match(/[ie]/) && x3.match(/^l/)) {
        continue l3
      }
      const word = `${x1}${x2}${x3}`
      if (word.match(/r.r/)) continue l3
      possibleWords.push(word)
    }
  }
}

possibleWords.sort()

possibleWords.forEach(word => {
  processor.addIfPossible(trie, word, 'ccvcc')
})

const words = processor.collect(trie)
fs.writeFileSync('list/word/5-c-c-v-c-c/full.csv', shuffleArray(words).sort().join('\n'))

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array
}
