import assert from 'node:assert/strict';
import { DEFAULT_PLATFORMS, buildPlatformExportReadiness, normalizePlatformSelection } from '../src/platformExportController.js';

assert.deepEqual(normalizePlatformSelection(['reels', 'REELS', 'tiktok']), ['reels', 'tiktok']);
assert.deepEqual(DEFAULT_PLATFORMS, ['reels', 'tiktok', 'shorts', 'youtube', 'square']);

const blocked = buildPlatformExportReadiness(null, ['youtube']);
assert.equal(blocked.valid, false);
assert.equal(blocked.platforms[0].status, 'blocked');

const master = new Blob(['master-video'], { type: 'video/webm' });
const ready = buildPlatformExportReadiness(master, ['reels', 'youtube', 'reels']);
assert.equal(ready.valid, true);
assert.deepEqual(ready.platforms.map((item) => item.platform), ['reels', 'youtube']);
assert.equal(ready.preservesEdit, true);
assert.equal(ready.preservesSourceTimestamps, true);
assert.equal(ready.platforms[0].output.width, 1080);
assert.equal(ready.platforms[1].output.width, 1920);

console.log('platform-export-ui-contract: PASS');
