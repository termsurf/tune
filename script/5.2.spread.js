
const fs = require('fs')

const possibilities = fs.readFileSync('inspiration/word/5-c-v-c-v-c/full.csv', 'utf-8').trim().split(/\n+/)
  // .reduce((m, x) => {
  //   m[x] = true
  //   return m
  // }, {})

const final = fs.readFileSync('list/term/5.2.csv', 'utf-8').trim().split(/\n+/)
  .map(x => {
    let [a, b] = x.split(',')
    let p = possibilities.shift()
    while (p && p.match(/[cCj]/)) {
      p = possibilities.shift()
    }
    a = a ? a : p
    return `${a},${b}`
  })

fs.writeFileSync('tmp/remaining5.csv', final.join('\n'))

function reduce(m, x) {
  let [a, b] = x.split(',')
  m[b] = a
  return m
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array
}
