import assert from 'node:assert/strict';
import { createGeneratedScene } from '../src/generatedMediaContract.js';
import { validateMixedMediaTimeline } from '../src/mediaTimelineGuard.js';

const uploaded = { id: 'bike-01', name: 'bike.mp4' };
const generated = createGeneratedScene({ id: 'ai-01', type: 'image', prompt: 'cinematic motorcycle image', duration: 2 });
generated.generationStatus = 'ready';
generated.assetUrl = 'generated://ai-01';

const good = validateMixedMediaTimeline({
  mediaItems: [uploaded],
  scenes: [
    { sourceType: 'uploaded', mediaId: 'bike-01' },
    generated
  ]
});
assert.equal(good.ready, true);
assert.deepEqual(good.resolved.map((item) => item.sourceType), ['uploaded', 'generated']);

const notReady = validateMixedMediaTimeline({
  mediaItems: [uploaded],
  scenes: [
    { sourceType: 'uploaded', mediaId: 'bike-01' },
    createGeneratedScene({ id: 'ai-02', prompt: 'another scene' })
  ]
});
assert.equal(notReady.ready, false);
assert.ok(notReady.issues.some((issue) => /not ready/i.test(issue)));
assert.ok(notReady.issues.some((issue) => /asset reference/i.test(issue)));

const missing = validateMixedMediaTimeline({
  mediaItems: [],
  scenes: [{ sourceType: 'uploaded', mediaId: 'missing' }]
});
assert.equal(missing.ready, false);
assert.ok(missing.issues.some((issue) => /uploaded source is missing/i.test(issue)));

console.log('mixed-media-timeline: PASS');
