import assert from 'node:assert/strict';
import { OUTPUT_PRESETS } from '../src/outputPresets.js';
import { buildSocialFilename, getSocialExportInfo, validateSocialExport } from '../src/socialExport.js';

const makeVideo = (size = 2048) => new Blob([new Uint8Array(size)], { type: 'video/webm' });

for (const id of ['portrait', 'square', 'landscape']) {
  const info = getSocialExportInfo(makeVideo(), id);
  assert.equal(info.id, id);
  assert.equal(info.width, OUTPUT_PRESETS[id].width);
  assert.equal(info.height, OUTPUT_PRESETS[id].height);
  assert.equal(info.extension, 'webm');
  assert.equal(validateSocialExport(makeVideo(), id).aspectRatio, OUTPUT_PRESETS[id].aspectRatio);
  assert.match(buildSocialFilename('My Bike Film', info), new RegExp(`${info.width}x${info.height}\\.webm$`));
}

assert.throws(() => validateSocialExport(new Blob([new Uint8Array(2048)], { type: 'text/plain' }), 'portrait'), /supported video file/i);
assert.throws(() => validateSocialExport(new Blob([new Uint8Array(10)], { type: 'video/webm' }), 'portrait'), /unexpectedly small/i);

console.log('social-export-hardening: PASS');
