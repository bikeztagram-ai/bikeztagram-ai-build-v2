import assert from 'node:assert/strict';
import { drawResolvedFrame } from '../src/renderFrameAdapter.js';

const calls = [];
const ctx = {
  save() {}, restore() {},
  drawImage(...args) { calls.push(args); }
};
const canvas = { width: 1080, height: 1920 };
const video = { videoWidth: 1920, videoHeight: 1080 };
const image = { naturalWidth: 1024, naturalHeight: 1024 };

const a = drawResolvedFrame(ctx, canvas, { type: 'video', element: video }, { motionStyle: 'slow-push', motionIntensity: 1 }, .5);
assert.equal(a.type, 'video');
assert.equal(calls.length, 1);

const b = drawResolvedFrame(ctx, canvas, { type: 'image', element: image }, { motionStyle: 'pan-right', motionIntensity: .8 }, .75);
assert.equal(b.type, 'image');
assert.equal(calls.length, 2);
assert.ok(calls[1][3] > 0 && calls[1][4] > 0);

console.log('render-frame-adapter: PASS');
