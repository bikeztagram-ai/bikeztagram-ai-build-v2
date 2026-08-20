import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/generate-music.js',import.meta.url),'utf8');
assert.match(api,/lyria-3-clip-preview/);
assert.match(api,/lyria-3-pro-preview/);
assert.match(api,/requestedDuration<=30/);
assert.match(api,/responseModalities:\['AUDIO','TEXT'\]/);
assert.match(api,/complete original song/);
assert.match(api,/do not imitate|do not reproduce/);
assert.doesNotMatch(api,/copy the melody|reproduce the riff/i);
console.log('batch27-lyria-song-modes: PASS');
