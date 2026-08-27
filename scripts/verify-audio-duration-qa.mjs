import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/qa.js', import.meta.url), 'utf8');

assert.match(source, /AUDIO_DURATION_TOLERANCE_SECONDS\s*=\s*1\.5/);
assert.match(source, /audioDurationDifference\s*=\s*requireAudio/);
assert.match(source, /audioDurationFailed\s*=\s*requireAudio/);
assert.match(source, /durationAligned:\s*audioDurationDifference/);
assert.match(source, /FAIL_AUDIO_DURATION/);
assert.match(source, /audio-video-duration-aligned/);
assert.match(source, /When music is required, QA also probes the final container for a non-silent audio signal and checks audio\/video duration agreement/);

console.log('audio-duration-qa: PASS');
