import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/generate-music.js',import.meta.url),'utf8');
assert.match(api,/zero-cost-local-music/);
assert.match(api,/paidAiMusicDisabled:true/);
assert.match(api,/generationMode:'procedural-original'/);
assert.match(api,/source:'planning-fallback'/);
assert.match(api,/audioAvailable:false/);
assert.doesNotMatch(api,/local-original-safety-fallback/);
assert.doesNotMatch(api,/lyria-3-(clip|pro)-preview/);
assert.doesNotMatch(api,/generativelanguage\.googleapis\.com\/v1beta\/models/);
console.log('batch27-zero-cost-music: PASS');
