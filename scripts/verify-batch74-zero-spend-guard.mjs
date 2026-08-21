import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const music=read('api/generate-music.js');
const pkg=JSON.parse(read('package.json'));

assert.equal(music.includes('lyria-3-clip-preview'),false);
assert.equal(music.includes('lyria-3-pro-preview'),false);
assert.match(music,/zero-cost-local-music/);
assert.match(music,/paidAiMusicDisabled:true/);
assert.match(music,/procedural-original/);
assert.match(pkg.scripts['verify:batch74'],/verify-batch74-zero-spend-guard/);

console.log('batch74-zero-spend-guard: PASS');
