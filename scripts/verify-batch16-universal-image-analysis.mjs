import assert from 'node:assert/strict';
import fs from 'node:fs';

const endpoint = fs.readFileSync(new URL('../api/analyse-image.js', import.meta.url), 'utf8');
const model = fs.readFileSync(new URL('../src/universalMediaModel.js', import.meta.url), 'utf8');

assert.match(endpoint, /mimeType.*image\//);
assert.match(endpoint, /gemini-3\.6-flash/);
assert.match(endpoint, /mediaType.*image/);
assert.match(endpoint, /subjects/);
assert.match(endpoint, /continuityNotes/);
assert.match(endpoint, /sourceOfTruth.*uploaded-media/);
assert.match(model, /normalizeUniversalAnalysis/);
assert.match(model, /normalizeSubject/);
assert.doesNotMatch(endpoint, /motorcycle footage/);
assert.doesNotMatch(endpoint, /motorcycle-only/);

console.log('batch16-universal-image-analysis: PASS');
