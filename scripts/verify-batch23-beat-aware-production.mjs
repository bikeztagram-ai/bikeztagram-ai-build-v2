import assert from 'node:assert/strict';
import fs from 'node:fs';

const production=fs.readFileSync(new URL('../api/production-plan.js',import.meta.url),'utf8');
const timeline=fs.readFileSync(new URL('../src/beatAwareTimeline.js',import.meta.url),'utf8');
const music=fs.readFileSync(new URL('../src/musicDirector.js',import.meta.url),'utf8');

assert.match(production,/attachSoundtrackToPlan/);
assert.match(production,/version:'8\.3'/);
assert.match(production,/Align editorial events to the soundtrack beat grid/);
assert.doesNotMatch(production,/motorcycleModel|ninja1000|kawasaki/i);
assert.match(timeline,/editorialStartTime/);
assert.match(timeline,/editorialEndTime/);
assert.match(timeline,/music-replacement-map-v1/);
assert.match(timeline,/beat-aware-v2/);
assert.match(music,/buildBeatGrid/);
assert.match(music,/swapReady:true/);
assert.match(music,/original:true/);
assert.match(music,/Do not reproduce or closely imitate/);

console.log('batch23-beat-aware-production: PASS');
