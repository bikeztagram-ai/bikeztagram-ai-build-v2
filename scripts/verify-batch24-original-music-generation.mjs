import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildMusicProfile } from '../src/musicProviderV2.js';

const api=fs.readFileSync(new URL('../api/generate-music.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../src/musicGenerator.js',import.meta.url),'utf8');
const director=fs.readFileSync(new URL('../src/musicDirector.js',import.meta.url),'utf8');

assert.match(api,/original-soundtrack-engine|zero-cost-local-music/);
assert.match(api,/generationModel:'procedural-cinematic-v2'/);
assert.match(api,/generationMode:'procedural-original'/);
assert.match(api,/buildMusicProfile/);
assert.match(client,/\/api\/generate-music/);
assert.match(client,/generateOriginalMusic/);
assert.match(client,/local-audio-fallback/);
assert.match(director,/buildBeatGrid/);
assert.match(director,/swapReady:true/);

const first=buildMusicProfile({genre:'hard-rock',mood:'dark',prompt:'dark aggressive motorcycle reveal'});
const second=buildMusicProfile({genre:'electronic',mood:'uplifting',prompt:'bright futuristic night ride'});
const repeat=buildMusicProfile({genre:'hard-rock',mood:'dark',prompt:'dark aggressive motorcycle reveal'});
assert.notDeepEqual(first.motif,second.motif,'Different creative briefs must produce different musical motifs.');
assert.notEqual(first.profileId,second.profileId,'Different creative briefs must produce different profile identities.');
assert.deepEqual(first,repeat,'The same creative brief must remain deterministic.');

console.log('batch24-original-music-generation: PASS');
