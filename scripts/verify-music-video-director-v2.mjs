import assert from 'node:assert/strict';
import {buildMusicVideoDirectives,applyMusicDirectivesToTimeline} from '../src/musicToVideoDirectorV2.js';
const audio={events:[{time:0,kind:'intro',type:'section',strength:1},{time:4,kind:'build',type:'section',strength:.7},{time:6,kind:'drop',type:'drop',strength:1},{time:13,kind:'finale',type:'section',strength:1}]};
const d=buildMusicVideoDirectives(audio);
assert.equal(d.find(x=>x.kind==='drop').action,'reveal-or-impact');
assert.equal(d.find(x=>x.kind==='finale').visual.preferGeneratedScene,true);
const shots=applyMusicDirectivesToTimeline([{start:6,duration:2}],d);
assert.equal(shots[0].musicAction,'reveal-or-impact');
console.log('Music-to-video Director V2 verification passed');
