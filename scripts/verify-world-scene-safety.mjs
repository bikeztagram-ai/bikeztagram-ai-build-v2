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

// Regression guard for the specific shaky/short-output issue observed in testing.
// Keep shake deliberately bounded; a large artificial oscillation makes the bike look unstable.
const shakeMatches = source.match(/Math\.sin\(t\*115\)\*([0-9.]+)/g) || [];
assert.equal(shakeMatches.length, 0, 'The previous high-frequency t*115 shake must not return.');

console.log('world-scene safety verification: PASS');
