import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/outputPresetTranscoder.js', import.meta.url), 'utf8');
const presets = fs.readFileSync(new URL('../src/outputPresets.js', import.meta.url), 'utf8');

for (const token of [
  'resolveOutputPreset',
  'transcodeRenderedFilmToPreset',
  'canvas.captureStream(30)',
  'video.captureStream',
  'MediaRecorder',
  'canvasStream.addTrack(track)',
  'new Blob(chunks',
  'URL.revokeObjectURL(sourceUrl)'
]) assert.ok(source.includes(token), `Expected transcoder source to contain: ${token}`);

for (const token of ['portrait', 'square', 'landscape', '1080', '1920', '1920, height: 1080']) {
  assert.ok(presets.includes(token), `Expected output presets source to contain: ${token}`);
}

assert.match(source, /preset\.width/);
assert.match(source, /preset\.height/);
assert.match(source, /sourceRatio/);
assert.match(source, /targetRatio/);

console.log('batch41-output-preset-transcoder: PASS');
