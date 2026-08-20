import assert from 'node:assert/strict';
import { critiqueAndImproveTimeline } from '../src/editCritic.js';

const cuts = [
  { mediaIndex: 0, startTime: 1, duration: 2, motionStyle: 'static', transition: 'fade-in', role: 'hook' },
  { mediaIndex: 1, startTime: 5, duration: 2.5, motionStyle: 'pan-right', transition: 'crossfade' },
  { mediaIndex: 2, startTime: 9, duration: 2.5, motionStyle: 'slow-push', transition: 'hard-cut' },
  { mediaIndex: 3, startTime: 13, duration: 2, motionStyle: 'static', transition: 'fade-out', role: 'hero-ending' }
];
const result = critiqueAndImproveTimeline(cuts, { flags: { action: true } });
assert.ok(result.cuts.length === 4);
assert.equal(result.cuts[0].motionStyle, 'static');
assert.equal(result.cuts[3].motionStyle, 'static');
assert.ok(result.cuts.every(c => c.motionIntensity <= 0.6));
assert.ok(result.cuts.every(c => !['whip-right','flash-cut','zoom-punch'].includes(c.transition)));
console.log('Batch 3 critic guardrail verification passed.');
