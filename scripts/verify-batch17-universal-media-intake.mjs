import assert from 'node:assert/strict';
import fs from 'node:fs';

const dispatcher = fs.readFileSync(new URL('../api/analyse-media.js', import.meta.url), 'utf8');
const image = fs.readFileSync(new URL('../api/analyse-image.js', import.meta.url), 'utf8');

assert.match(dispatcher, /analyseVideo/);
assert.match(dispatcher, /analyseImage/);
assert.match(dispatcher, /mimeType\.startsWith\('image\/'\)/);
assert.match(dispatcher, /mimeType\.startsWith\('video\/'\)/);
assert.match(image, /mediaType.*image/);
assert.match(image, /subjects/);
assert.match(image, /continuityNotes/);
assert.doesNotMatch(dispatcher, /motorcycle-only/);

console.log('batch17-universal-media-intake: PASS');
