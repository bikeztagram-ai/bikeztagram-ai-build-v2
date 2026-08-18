import assert from 'node:assert/strict';
import { resolveMediaSource, allTimelineSourcesReady } from '../src/mediaSourceResolver.js';

const media = [{ url: 'blob:video-a', type: 'video' }, { src: 'blob:video-b', type: 'video' }];

const uploaded = resolveMediaSource({ sourceType: 'uploaded', mediaIndex: 1 }, media);
assert.equal(uploaded.ready, true);
assert.equal(uploaded.generated, false);
assert.equal(uploaded.url, 'blob:video-b');

const generatedPending = resolveMediaSource({ sourceType: 'generated', generated: true, generationStatus: 'planned', generatedMediaType: 'image' }, media);
assert.equal(generatedPending.ready, false);

const generatedReady = resolveMediaSource({ sourceType: 'generated', generated: true, generationStatus: 'ready', generatedMediaType: 'image', assetUrl: 'blob:image-a' }, media);
assert.equal(generatedReady.ready, true);
assert.equal(generatedReady.generated, true);
assert.equal(generatedReady.type, 'image');

const mixed = allTimelineSourcesReady([
  { sourceType: 'uploaded', mediaIndex: 0 },
  { sourceType: 'generated', generated: true, generationStatus: 'ready', generatedMediaType: 'video', assetUrl: 'blob:generated-video' }
], media);
assert.equal(mixed.ready, true);
assert.equal(mixed.cuts.length, 2);

const broken = allTimelineSourcesReady([
  { sourceType: 'uploaded', mediaIndex: 9 },
  { sourceType: 'generated', generated: true, generationStatus: 'planned' }
], media);
assert.equal(broken.ready, false);
assert.equal(broken.issues.length, 2);

console.log('media-source-resolver: PASS');
