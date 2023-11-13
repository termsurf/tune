
const fs = require('fs')
const processor = require('./4.new')
const consonants = `mnqgdbptkhsfvxrlwyzcCj`
const vowels = `aeiou`
const pairs = `
dj
gj
fk
kx
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
rb
rk
rd
rt
rz
rp
rg
tx
lz
lt
lp
br
bl
dr
fr
fl
gr
gl
gz
ks
kr
kl
mw
pl
pr
sr
sw
sl
sm
sn
tr
tx
tw
vr
vl
xm
xl
`.trim().split(/\n/)

const trie = processor.createTrie()
const possibleWords = []
let i1 = 0
l1:
while (i1 < consonants.length) {
  let x1 = consonants[i1++]
  let i2 = 0
  l2:
  while (i2 < vowels.length) {
    let x2 = vowels[i2++]
    let i3 = 0
    l3:
    while (i3 < pairs.length) {
      let x3 = pairs[i3++]
      if (x2.match(/[ie]/) && x3.match(/^l/)) {
        continue l3
      } else if (x3.match(/[hyw]/)) {
        continue l3
      }
      const word = `${x1}${x2}${x3}`
      if (word.match(/r.r/)) continue l3
      let i4 = 0
      l4:
      while (i4 < vowels.length) {
        let x4 = vowels[i4++]
        let i5 = 0
        if (`${x3}${x4}`.match(/^.w[uo]/)) continue l4
        l5:
        while (i5 < consonants.length) {
          let x5 = consonants[i5++]
          if (x4.match(/[ie]/) && x5.match(/[lr]/)) {
            continue l5
          } else if (x5.match(/[hyw]/)) {
            continue l5
          }
          const word = `${x1}${x2}${x3}${x4}${x5}`
          if (word.match(/r.r/)) continue l5
          possibleWords.push(word)
        }
      }
    }
  }
}

possibleWords.sort()

possibleWords.forEach(word => {
  processor.addIfPossible(trie, word, 'cvccvc')
})

const words = processor.collect(trie)

fs.writeFileSync('inspiration/word/6-c-v-c-c-v-c/full.csv', shuffleArray(words).sort().join('\n'))

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array
}
