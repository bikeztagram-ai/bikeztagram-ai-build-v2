import assert from 'node:assert/strict';
import { drawUnifiedMediaFrame, unifiedMediaKind } from '../src/unifiedMediaRenderer.js';

const calls = [];
const ctx = { save() {}, restore() {}, drawImage(...args) { calls.push(args); } };
const canvas = { width: 1080, height: 1920 };
const video = { videoWidth: 1920, videoHeight: 1080 };
const image = { naturalWidth: 1024, naturalHeight: 1024 };

const videoSource = { ready: true, kind: 'video', element: video };
const imageSource = { ready: true, kind: 'image', element: image };

assert.equal(unifiedMediaKind(videoSource), 'video');
assert.equal(unifiedMediaKind(imageSource), 'image');

drawUnifiedMediaFrame(ctx, canvas, videoSource, { motionStyle: 'slow-push', motionIntensity: 1 }, .4);
drawUnifiedMediaFrame(ctx, canvas, imageSource, { motionStyle: 'pan-right', motionIntensity: .8 }, .6);
assert.equal(calls.length, 2);

assert.throws(() => drawUnifiedMediaFrame(ctx, canvas, { ready: false, reason: 'not ready' }), /not ready/i);
assert.throws(() => drawUnifiedMediaFrame(ctx, canvas, { ready: true, kind: 'audio', element: {} }), /unsupported/i);

console.log('unified-media-renderer: PASS');
