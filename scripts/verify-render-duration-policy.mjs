import assert from 'node:assert/strict';
import { assessRenderDuration } from '../src/renderDurationPolicy.js';

const healthy = assessRenderDuration(14.2, 15);
assert.equal(healthy.valid, true);
assert.equal(healthy.reason, 'within-duration-tolerance');

const borderline = assessRenderDuration(13.6, 15);
assert.equal(borderline.valid, true);

const short = assessRenderDuration(2.1, 15);
assert.equal(short.valid, false);
assert.equal(short.reason, 'materially-short');
assert.equal(short.shortfallSeconds, 12.9);

const invalid = assessRenderDuration(0, 15);
assert.equal(invalid.valid, false);
assert.equal(invalid.reason, 'invalid-output-duration');

console.log('render-duration-policy: PASS');
