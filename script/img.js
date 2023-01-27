
const fs = require('fs')
const map = {
  m: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/m-109.svg?raw=true" />`,
  n: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/n-110.svg?raw=true" />`,
  q: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/q-113.svg?raw=true" />`,
  g: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/g-103.svg?raw=true" />`,
  d: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/d-100.svg?raw=true" />`,
  b: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/b-98.svg?raw=true" />`,
  p: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/p-112.svg?raw=true" />`,
  t: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/t-116.svg?raw=true" />`,
  k: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/k-107.svg?raw=true" />`,
  h: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/h-104.svg?raw=true" />`,
  s: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/s-115.svg?raw=true" />`,
  f: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/f-102.svg?raw=true" />`,
  v: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/v-118.svg?raw=true" />`,
  z: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/z-122.svg?raw=true" />`,
  j: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/j-106.svg?raw=true" />`,
  x: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/x-120.svg?raw=true" />`,
  c: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/c-99.svg?raw=true" />`,
  C: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/$C-67.svg?raw=true" />`,
  w: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/w-119.svg?raw=true" />`,
  y: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/y-121.svg?raw=true" />`,
  l: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/l-108.svg?raw=true" />`,
  r: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/r-114.svg?raw=true" />`,
  i: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/i-105.svg?raw=true" />`,
  e: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/e-101.svg?raw=true" />`,
  a: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/a-97.svg?raw=true" />`,
  o: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/o-111.svg?raw=true" />`,
  u: `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/u-117.svg?raw=true" />`,
  D: `<img height="28" src="https://github.com/teamtreesurf/tune/blob/make/view/d.dot.svg?raw=true" />`,
  ' ': `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/space-32.svg?raw=true" />`,
  '!': `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/exclam-33.svg?raw=true" />`,
  '(': `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/parenleft-40.svg?raw=true" />`,
  ')': `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/parenright-41.svg?raw=true" />`,
  ',': `<img height="28" src="https://github.com/teamtreesurf/tone/blob/make/text/svgs/comma-44.svg?raw=true" />`,
}

const WORDS = `zig lax(gal(p, D), gal(k, D)), gal(b, D)
`.trim().split(/\n+/)

const out = WORDS.map(x => x.split('').map(x => map[x]).join(''))

fs.writeFileSync('tmp/img.out.txt', out.join('\n'))
