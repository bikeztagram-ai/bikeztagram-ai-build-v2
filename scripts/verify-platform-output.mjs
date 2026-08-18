import assert from 'node:assert/strict';
import { buildPlatformTranscodePlan } from '../src/platformOutputRenderer.js';

const reels = buildPlatformTranscodePlan('reels');
assert.deepEqual([reels.width, reels.height], [1080, 1920]);
assert.equal(reels.aspect, '9:16');
assert.equal(reels.outputMime, 'video/mp4');
assert.match(reels.videoFilter, /scale=1080:1920/);
assert.match(reels.videoFilter, /crop=1080:1920/);

const youtube = buildPlatformTranscodePlan('youtube');
assert.deepEqual([youtube.width, youtube.height], [1920, 1080]);
assert.equal(youtube.aspect, '16:9');
assert.match(youtube.videoFilter, /scale=1920:1080/);
assert.match(youtube.videoFilter, /crop=1920:1080/);

const square = buildPlatformTranscodePlan('square');
assert.deepEqual([square.width, square.height], [1080, 1080]);
assert.equal(square.aspect, '1:1');

const contained = buildPlatformTranscodePlan('youtube', { fit: 'contain', fps: 24 });
assert.equal(contained.cropMode, 'contain');
assert.equal(contained.fps, 24);
assert.match(contained.videoFilter, /pad=1920:1080/);

console.log('platform-output: PASS');
