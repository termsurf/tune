
const fs = require('fs')
const consonants = `mnqgdbptkhsfvxrlwyzcCj`
const vowels = `aeiou`

const words = []

let i1 = 0
l1:
while (i1 < consonants.length) {
  let x1 = consonants[i1++]
  if (x1 === 'q' || x1 === 'j') {
    continue l1
  }
  let i2 = 0
  l2:
  while (i2 < vowels.length) {
    let x2 = vowels[i2++]
    let i3 = 0
    l3:
    while (i3 < consonants.length) {
      let x3 = consonants[i3++]
      if (x2.match(/[ie]/) && x3.match(/[lr]/)) {
        continue l3
      } else if (x3.match(/[hyw]/)) {
        continue l3
      }
      words.push(`${x1}${x2}${x3}`)
    }
  }
}

fs.writeFileSync('inspiration/word/3-c-v-c/full.full.csv', shuffleArray(words).join('\n'))

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array
}
