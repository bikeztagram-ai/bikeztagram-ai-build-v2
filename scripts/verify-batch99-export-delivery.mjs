import assert from 'node:assert/strict';
import { SOCIAL_PRESETS, getSocialExportInfo, validateExportedVideo } from '../src/socialExport.js';
import { prepareSocialExport } from '../src/outputExportController.js';

// 1. Verify reliable profiles
assert.deepEqual(Object.keys(SOCIAL_PRESETS), ['portrait', 'square', 'landscape']);
assert.equal(SOCIAL_PRESETS.portrait.width, 1080);
assert.equal(SOCIAL_PRESETS.portrait.height, 1920);
assert.equal(SOCIAL_PRESETS.square.width, 1080);
assert.equal(SOCIAL_PRESETS.square.height, 1080);
assert.equal(SOCIAL_PRESETS.landscape.width, 1920);
assert.equal(SOCIAL_PRESETS.landscape.height, 1080);

// 2. Verify deterministic filenames and metadata
const testBlob = new Blob(['sample-video-content'], { type: 'video/webm' });
const info = getSocialExportInfo(testBlob, 'landscape');
assert.ok(info.filename.startsWith('bikeztagram-ai-film-1920x1080.webm'));
assert.ok(info.timestamp);
assert.equal(info.exportId, `export-landscape-${testBlob.size}`);
assert.equal(info.width, 1920);
assert.equal(info.height, 1080);
assert.equal(info.extension, 'webm');

// 3. Verify export validation
// An empty blob should throw an error
assert.rejects(async () => {
  await validateExportedVideo(null);
}, /Export validation failed/);

// A non-empty blob in Node (no browser DOM) should validate successfully with correct dimensions
const validation = await validateExportedVideo(testBlob, 'square');
assert.equal(validation.valid, true);
assert.equal(validation.sizeBytes, testBlob.size);
assert.equal(validation.presetId, 'square');
assert.equal(validation.width, 1080);
assert.equal(validation.height, 1080);

// 4. Verify progress, error states, and graceful recovery fallback
// In Node.js environment, formatting/transcoding is unsupported because 'document' and 'MediaRecorder' are not defined.
// prepareSocialExport should catch this error, recover gracefully, and return the original blob mapped to the portrait preset with fallback indicators.
const result = await prepareSocialExport(testBlob, { preset: 'square' });
assert.equal(result.transcoded, false);
assert.equal(result.recoveryFallback, true);
assert.ok(result.recoveryReason.includes('Browser video formatting is unavailable') || result.recoveryReason.includes('MediaRecorder'));
assert.equal(result.info.preset, 'portrait');
assert.equal(result.info.width, 1080);
assert.equal(result.info.height, 1920);
assert.equal(result.info.aspectRatio, '9:16');
assert.equal(result.blob, testBlob); // original blob is preserved

console.log('batch99-export-delivery-verification: PASS');
