import assert from 'node:assert/strict';
import { buildRenderRecordingPlan, canRecordRenderPlan } from '../src/renderRecordingPlan.js';

const plan = buildRenderRecordingPlan({
  ready: true,
  mode: 'unified-media-pending',
  targetDuration: 6,
  cuts: [
    { renderIndex: 0, startTime: 0, duration: 3, storyRole: 'hook', mediaSource: { kind: 'video', url: 'blob:video' } },
    { renderIndex: 1, startTime: 0, duration: 3, storyRole: 'hero', mediaSource: { kind: 'image', url: 'blob:image' } }
  ]
});

assert.equal(plan.ready, true);
assert.equal(plan.cuts.length, 2);
assert.equal(plan.cuts[0].kind, 'video');
assert.equal(plan.cuts[1].kind, 'image');
assert.equal(canRecordRenderPlan(plan), true);

const blocked = buildRenderRecordingPlan({ ready: false });
assert.equal(blocked.ready, false);

const invalid = buildRenderRecordingPlan({
  ready: true,
  cuts: [{ mediaSource: { kind: 'video', url: 'blob:video' }, duration: 0 }]
});
assert.equal(canRecordRenderPlan(invalid), false);

console.log('render-recording-plan: PASS');
