import assert from 'node:assert/strict';
import fs from 'node:fs';

const enhancer = fs.readFileSync(new URL('../src/aiVideoEnhancer.js', import.meta.url), 'utf8');
const renderer = fs.readFileSync(new URL('../src/cinematicRendererV3.js', import.meta.url), 'utf8');

assert.match(enhancer, /sourceType\s*:\s*['"]generated['"]/);
assert.match(enhancer, /provider\s*:\s*['"]Runway Gen-4\.5['"]/);
assert.match(enhancer, /sourceUrl|url\s*:/);
assert.match(renderer, /playableSource/);
assert.match(renderer, /no playable media/);
assert.doesNotMatch(renderer, /if\s*\(isGen\).*procedural|procedural.*placeholder/i);
console.log('generated-media-contract: PASS');
