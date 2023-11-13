
const fs = require('fs')
const consonants = `mnqgdbptkhsfvxrlwyzcCj`
const vowels = `aeiou`
const ends = `
dj
fk
ft
qk
nd
nz
mz
rC
rc
md
gz
zd
sk
sp
st
rd
rt
rk
rg
rb
rz
rp
tx
lz
lt
lp
`.trim().split(/\n/)

const words = []

let i1 = 0
l1:
while (i1 < consonants.length) {
  let x1 = consonants[i1++]
  let i2 = 0
  l2:
  while (i2 < vowels.length) {
    let x2 = vowels[i2++]
    let i3 = 0
    if (`${x1}${x2}`.match('wi')) continue l2
    l3:
    while (i3 < ends.length) {
      let x3 = ends[i3++]
      if (x2.match(/[ie]/) && x3.match(/^l/)) {
        continue l3
      }
      if (`${x1}${x2}${x3}`.match(/r.r/)) {
        continue l3
      }
      let i4 = 0
      l4:
      while (i4 < vowels.length) {
        let x4 = vowels[i4++]
        let i5 = 0
        l5:
        while (i5 < consonants.length) {
          let x5 = consonants[i5++]
          const word = `${x1}${x2}${x3}${x4}${x5}`
          if (x4.match(/[ei]/) && x5.match(/l/)) {
            continue l5
          } else if (x5.match(/[hyw]/)) {
            continue l5
          }
          words.push(word)
        }
      }
    }
  }
}

fs.writeFileSync('inspiration/word/6-c-v-c-c-v-c/full.csv', shuffleArray(words).join('\n'))

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array
}
