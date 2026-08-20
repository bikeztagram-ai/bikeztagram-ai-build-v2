import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../api/analyse.js', import.meta.url), 'utf8');

assert.match(source, /GENERAL-PURPOSE AI FILMMAKER/);
assert.match(source, /actual uploaded media/);
assert.match(source, /subjects/);
assert.match(source, /category/);
assert.match(source, /identity/);
assert.match(source, /attributes/);
assert.match(source, /verifiedEvents/);
assert.match(source, /continuityAnchors/);
assert.match(source, /environment continuity/);
assert.match(source, /sourceOfTruth:'uploaded-media'/);
assert.doesNotMatch(source, /motorcycle-only|motorcycle-specific/i);

console.log('batch15-universal-media-understanding: PASS');
