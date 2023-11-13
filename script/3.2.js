
const fs = require('fs')
const consonants = `mnqgdbptkhsfvxrlwyz`
const vowels = `aeiou`
const pairs = `
br
bl
dr
fr
fl
gr
gl
kr
kl
ky
pr
sr
sl
tr
tx
vl
vr
xr
xl
`.trim().split(/\n/)

const words = []

let i1 = 0
l1:
while (i1 < pairs.length) {
  let x1 = pairs[i1++]
  let i2 = 0
  l2:
  while (i2 < vowels.length) {
    let x2 = vowels[i2++]
    const word = `${x1}${x2}`
    words.push(word)
  }
}

fs.writeFileSync('list/word/3-c-c-v/full.csv', shuffleArray(words).join('\n'))

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array
}
