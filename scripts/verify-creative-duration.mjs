import assert from 'node:assert/strict';
import { resolveCreativeDuration, CREATIVE_DURATION_LIMITS } from '../src/creativeDuration.js';

assert.equal(resolveCreativeDuration('make a 30 second cinematic reel'), 30);
assert.equal(resolveCreativeDuration('create a 1 minute cinematic film'), 60);
assert.equal(resolveCreativeDuration('make a 1 minute 20 second film'), 60);
assert.equal(resolveCreativeDuration('make a 4 second teaser'), 5);
assert.equal(resolveCreativeDuration('make a 90 second film'), 60);
assert.equal(resolveCreativeDuration('cinematic motorcycle reel', 22), 22);
assert.deepEqual(CREATIVE_DURATION_LIMITS, { minSeconds: 5, maxSeconds: 60 });

console.log('creative-duration-authority: PASS');
