import assert from 'node:assert/strict';
import fs from 'node:fs';

const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const qa = fs.readFileSync(new URL('../src/qa.js', import.meta.url), 'utf8');

assert.match(main, /import ['"]\.\/qa\.js['"]/);
assert.match(qa, /installAutomaticQAObserver\(\)/);
assert.match(qa, /validateRenderedVideo/);
assert.match(qa, /blackFrameRatio/);
assert.match(qa, /playbackAdvanced/);

console.log('batch8-qa-activation: PASS');
