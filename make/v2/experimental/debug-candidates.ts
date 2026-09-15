import { ipaToTuneCandidates, talkToCandidateLevels } from '../code/talk-to-tune'
import { makeIpaToTalk } from '@cluesurf/talk/ipa'

const ipa = 'ˈɛləfənt'
const talk = makeIpaToTalk(ipa)
console.log(`Talk: ${talk}`)

const { levels, segments } = talkToCandidateLevels(talk)
console.log(`\nSegments:`)
for (const s of segments) {
  console.log(`  ${s.type} raw="${s.raw}" options=[${s.options.map(o => `${o.tune}:${o.score}`).join(', ')}]`)
}

console.log(`\nLevels:`)
for (let i = 0; i < 5; i++) {
  console.log(`  [${i}]: ${levels[i].map(o => `${o.tune}:${o.score}`).join(', ')}`)
}

const candidates = ipaToTuneCandidates(ipa, 50)
console.log(`\nAll ${candidates.length} candidates:`)
for (const c of candidates) {
  console.log(`  ${c.word} total=${c.total} scores=[${c.scores.join(',')}]`)
}
