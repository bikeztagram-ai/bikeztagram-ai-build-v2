import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const source = fs.readFileSync(path.join(root, 'src/worldScene.js'), 'utf8');

assert.match(source, /captureStream\(30\)/, 'World scene must remain a real-time recorded canvas render.');
assert.match(source, /recorder\.start\(/, 'World scene must start MediaRecorder before frame production.');
assert.match(source, /recorder\.stop\(\)/, 'World scene must stop MediaRecorder after the requested duration.');
assert.match(source, /performance\.now\(\)/, 'World scene duration must be clock-based rather than frame-count based.');
assert.match(source, /duration\*1000/, 'World scene must honour the requested duration.');
assert.match(source, /onProgress\?\./, 'World scene must expose render progress.');
assert.match(source, /MediaRecorder\.isTypeSupported/, 'World scene must choose a browser-supported recording codec.');
assert.match(source, /chunks\.length/, 'World scene must reject an empty recording.');
assert.match(source, /segmenter\?\.close/, 'MediaPipe resources must be released after segmentation.');
assert.match(source, /URL\.revokeObjectURL\(source\.url\)/, 'Temporary local source URLs must be released.');

// Regression guard for the shaky-output issue: any artificial shake must remain small.
const shakeMatches = [...source.matchAll(/Math\.sin\(t\*([0-9.]+)\)\*([0-9.]+)/g)];
for (const match of shakeMatches) {
  const frequency = Number(match[1]);
  const amplitude = Number(match[2]);
  assert.ok(amplitude <= 3, `World-scene shake amplitude is too large: ${frequency}Hz * ${amplitude}px`);
}

console.log('world-scene safety verification: PASS');
