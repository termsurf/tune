
const fs = require('fs')
const processor = require('./4.new')
const consonants = `mngdbptkhsfvxrlwyzcCj`
const vowels = `aeiou`

const trie = processor.createTrie()
const possibleWords = []

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
    if (`${x1}${x2}`.match(/w[iou]/)) continue l2
    l3:
    while (i3 < consonants.length) {
      let x3 = consonants[i3++]
      if (x2.match(/[ei]/) && x3.match(/l/)) {
        continue l3
      }
      if (`${x1}${x2}${x3}`.match(/r.r/)) continue l3
      let i4 = 0
      l4:
      while (i4 < vowels.length) {
        let x4 = vowels[i4++]
        let i5 = 0
        if (`${x3}${x4}`.match(/w[iou]/)) continue l4
        l5:
        while (i5 < consonants.length) {
          let x5 = consonants[i5++]
          if (x4.match(/[ei]/) && x5.match(/[lr]/)) {
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
  processor.addIfPossible(trie, word, 'cvcvc')
})

const words = processor.collect(trie)
fs.writeFileSync('inspiration/word/5-c-v-c-v-c/full.csv', shuffleArray(words).join('\n'))

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array
}
