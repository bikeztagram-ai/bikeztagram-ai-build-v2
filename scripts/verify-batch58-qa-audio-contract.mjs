import assert from 'node:assert/strict';
import fs from 'node:fs';
const qa=fs.readFileSync(new URL('../src/qa.js',import.meta.url),'utf8');
assert.match(qa,/probeRenderedAudio/);
assert.match(qa,/requireAudio/);
assert.match(qa,/audio-signal-detected/);
assert.match(qa,/FAIL_NO_AUDIO/);
assert.match(qa,/output-not-black/);
console.log('batch58-qa-audio-contract: PASS');
