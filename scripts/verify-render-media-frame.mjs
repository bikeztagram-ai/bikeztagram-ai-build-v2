import assert from 'node:assert/strict';
import { drawRenderMedia } from '../src/renderMediaFrame.js';

const calls = [];
const ctx = { drawImage: (...args) => calls.push(args) };
const canvas = { width: 1080, height: 1920 };
const image = { naturalWidth: 1000, naturalHeight: 1000 };

drawRenderMedia(ctx, { kind: 'image', element: image }, { motionStyle: 'slow-push', motionIntensity: 1 }, 0.5, canvas);
assert.equal(calls.length, 1);
assert.equal(calls[0][0], image);
assert.equal(calls[0].length, 5);

const video = { videoWidth: 1920, videoHeight: 1080 };
drawRenderMedia(ctx, { kind: 'video', element: video }, { motionStyle: 'pan-right', motionIntensity: 0.8 }, 0.75, canvas);
assert.equal(calls.length, 2);
assert.equal(calls[1][0], video);

console.log('render-media-frame: PASS');
