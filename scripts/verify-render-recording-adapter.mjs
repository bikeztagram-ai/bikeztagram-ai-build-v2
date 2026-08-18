import assert from 'node:assert/strict';
import { buildStableRendererInput } from '../src/renderRecordingAdapter.js';

const mediaItems = [
  { id: 'bike-1', sourceUrl: 'blob:https://example.test/source-a' },
  { id: 'bike-2', sourceUrl: 'blob:https://example.test/source-b' },
];

const readyPlan = {
  ready: true,
  durationSeconds: 5,
  cuts: [
    { source: mediaItems[1].sourceUrl, startTime: 1.2, duration: 2, renderIndex: 1, storyRole: 'action' },
    { source: mediaItems[0].sourceUrl, startTime: 0, duration: 3, renderIndex: 0, storyRole: 'hero' },
  ],
};

const adapted = buildStableRendererInput(readyPlan, mediaItems);
assert.equal(adapted.ready, true);
assert.deepEqual(adapted.plan.cuts.map((cut) => cut.mediaIndex), [1, 0]);
assert.equal(adapted.plan.cuts[0].duration, 2);
assert.equal(adapted.plan.cuts[1].storyRole, 'hero');

const fallbackPlan = {
  ready: true,
  durationSeconds: 2,
  cuts: [{ source: 'missing-url', startTime: 0, duration: 2, renderIndex: 1 }],
};
const fallback = buildStableRendererInput(fallbackPlan, mediaItems);
assert.equal(fallback.ready, true);
assert.equal(fallback.plan.cuts[0].mediaIndex, 1);

const blocked = buildStableRendererInput({ ready: false }, mediaItems);
assert.equal(blocked.ready, false);

const missing = buildStableRendererInput({
  ready: true,
  durationSeconds: 2,
  cuts: [{ source: 'missing-url', startTime: 0, duration: 2 }],
}, mediaItems);
assert.equal(missing.ready, false);
assert.match(missing.reason, /cannot be mapped/);

console.log('render recording adapter verification passed');
