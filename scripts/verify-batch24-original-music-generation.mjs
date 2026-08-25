import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/generate-music.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../src/musicGenerator.js',import.meta.url),'utf8');
const director=fs.readFileSync(new URL('../src/musicDirector.js',import.meta.url),'utf8');

assert.match(api,/original-soundtrack-engine|zero-cost-local-music/);
assert.match(api,/generationMode:'procedural-original-cinematic'|generationMode:'procedural-original'/);
assert.match(client,/\/api\/generate-music/);
assert.match(client,/generateOriginalMusic/);
assert.match(client,/local-audio-fallback/);
assert.match(director,/buildBeatGrid/);
assert.match(director,/swapReady:true/);

console.log('batch24-original-music-generation: PASS');
