import assert from 'node:assert/strict';
import fs from 'node:fs';

const enhancer = fs.readFileSync(new URL('../src/aiVideoEnhancer.js', import.meta.url), 'utf8');
const renderer = fs.readFileSync(new URL('../src/cinematicRendererV3.js', import.meta.url), 'utf8');

assert.match(enhancer, /sourceType:\s*['"]generated['"]/);
assert.match(enhancer, /provider:\s*['"]Runway Gen-4\.5['"]/);
assert.match(enhancer, /sourceUrl|source:\s*['"]runway-gen4\.5['"]/);
assert.match(renderer, /sourceType|generated/);
assert.match(renderer, /HTMLVideoElement|video/);
assert.doesNotMatch(renderer, /procedural.*placeholder|placeholder.*procedural/i);
console.log('generated-media-contract: PASS');
