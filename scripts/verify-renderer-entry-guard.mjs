import assert from 'node:assert/strict';
import { prepareRendererRequest } from '../src/rendererEntryGuard.js';

const result = prepareRendererRequest({
  mediaItems: [{ url: 'blob:source', type: 'video' }],
  plan: {
    targetDuration: 6,
    cuts: [
      { startTime: 0, duration: 3, mediaIndex: 0, storyRole: 'hook' },
      { startTime: 3, duration: 3, storyRole: 'hero' }
    ]
  }
});
assert.equal(result.readiness.ready, true);
assert.equal(result.execution.ready, true);
assert.equal(result.plan.cuts[1].mediaIndex, 0);
assert.equal(result.execution.cuts.length, 2);

const mixed = prepareRendererRequest({
  mediaItems: [{ url: 'blob:source', type: 'video' }],
  plan: {
    targetDuration: 6,
    cuts: [
      { startTime: 0, duration: 3, mediaIndex: 0, sourceType: 'uploaded', storyRole: 'hook' },
      { startTime: 0, duration: 3, sourceType: 'generated', generationStatus: 'ready', generatedMediaType: 'image', assetUrl: 'blob:generated-image', storyRole: 'hero' }
    ]
  }
});
assert.equal(mixed.readiness.ready, true);
assert.equal(mixed.execution.ready, true);
assert.equal(mixed.execution.cuts[1].generated, true);
assert.equal(mixed.execution.cuts[1].sourceType, 'image');

assert.throws(() => prepareRendererRequest({ mediaItems: [], plan: { targetDuration: 6, cuts: [{ startTime: 0, duration: 3 }] } }), /Render readiness failed/);

console.log('renderer-entry-guard: PASS');
