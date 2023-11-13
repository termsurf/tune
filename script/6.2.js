
const fs = require('fs')
const consonants = `mnqgdbptkhsfvxrlwyz`
const vowels = `aeiou`
const starts = `
br
bl
bw
dr
dw
fr
fl
fw
gr
gl
gw
kr
kl
kw
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
vl
vr
xr
xl
xm
xw
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

const words = []

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
    while (i3 < consonants.length) {
      let x3 = consonants[i3++]
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
        if (`${x3}${x4}`.match('wi')) continue l4
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

fs.writeFileSync('list/word/6-c-v-c-c-v-c/full.csv', shuffleArray(words).join('\n'))

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array
}
