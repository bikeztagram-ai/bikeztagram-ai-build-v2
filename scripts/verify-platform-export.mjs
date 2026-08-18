import assert from 'node:assert/strict';
import { buildPlatformExportReadiness, normalizePlatformSelection } from '../src/platformExportController.js';

assert.deepEqual(normalizePlatformSelection(['reels', 'REELS', 'youtube', '', 'youtube']), ['reels', 'youtube']);
assert.deepEqual(normalizePlatformSelection([]), ['reels']);

const blocked = buildPlatformExportReadiness(null, ['reels', 'youtube']);
assert.equal(blocked.valid, false);
assert.equal(blocked.platforms[0].status, 'blocked');

const master = new Blob(['verified-master-video'], { type: 'video/webm' });
const ready = buildPlatformExportReadiness(master, ['reels', 'youtube', 'square']);
assert.equal(ready.valid, true);
assert.equal(ready.source, 'completed-cinematic-master');
assert.equal(ready.preservesEdit, true);
assert.equal(ready.preservesSourceTimestamps, true);
assert.deepEqual(ready.platforms.map((item) => [item.platform, item.output.width, item.output.height]), [
  ['reels', 1080, 1920],
  ['youtube', 1920, 1080],
  ['square', 1080, 1080],
]);

console.log('platform-export: PASS');
