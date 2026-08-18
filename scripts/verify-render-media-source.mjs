import assert from 'node:assert/strict';
import { prepareRenderMediaSource, isImageRenderSource, isVideoRenderSource } from '../src/renderMediaSource.js';

const video = prepareRenderMediaSource({ source: 'blob:video', type: 'video' });
assert.equal(video.ready, true);
assert.equal(isVideoRenderSource(video), true);

const mp4 = prepareRenderMediaSource({ source: 'blob:video2', type: 'video/mp4' });
assert.equal(mp4.ready, true);
assert.equal(mp4.kind, 'video');

const image = prepareRenderMediaSource({ source: 'blob:image', type: 'image' });
assert.equal(image.ready, true);
assert.equal(isImageRenderSource(image), true);

const png = prepareRenderMediaSource({ source: 'blob:image2', type: 'image/png' });
assert.equal(png.ready, true);
assert.equal(png.kind, 'image');

const missing = prepareRenderMediaSource({ type: 'image' });
assert.equal(missing.ready, false);

const unsupported = prepareRenderMediaSource({ source: 'blob:x', type: 'audio' });
assert.equal(unsupported.ready, false);
assert.match(unsupported.reason, /unsupported/i);

console.log('render-media-source: PASS');
