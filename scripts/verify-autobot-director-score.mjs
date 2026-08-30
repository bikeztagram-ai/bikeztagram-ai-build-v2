import assert from 'node:assert/strict';
import { scoreMedia } from '../src/director.js';

const parked = scoreMedia({ type: 'video', name: 'motorcycle parked static', duration: 5, width: 1920, height: 1080 });
const action = scoreMedia({ type: 'video', name: 'motorcycle accelerating cornering chase', duration: 5, width: 1920, height: 1080 });
const medium = scoreMedia({ type: 'video', name: 'motorcycle moving', duration: 6, width: 1920, height: 1080 });
const excessive = scoreMedia({ type: 'video', name: 'motorcycle moving', duration: 30, width: 1920, height: 1080 });

assert.ok(action >= parked + 10, `action score should clearly beat static footage: ${action} vs ${parked}`);
assert.ok(medium >= excessive, `very long clips should not outrank a social-friendly medium clip: ${medium} vs ${excessive}`);
assert.ok(action <= 100 && parked >= 0 && medium <= 100 && excessive >= 0);
console.log('autobot-director-score: PASS');
