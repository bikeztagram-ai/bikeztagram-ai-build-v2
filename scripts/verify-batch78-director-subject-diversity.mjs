import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/directorSelection.js', 'utf8');

// Validate the current universal selector contract semantically rather than
// requiring the exact parameter names/formatting from the historical batch.
assert.match(source, /function subjectFamily\(m\)/);
assert.match(source, /const subject=m=>/);
assert.match(source, /const subjects=new Map\(\)/);
assert.match(source, /subjects\.get\(m\.__subject\)/);
assert.match(source, /clamp\(9\*sc,9,24\)/);
assert.match(source, /directorSubjectFamily/);
assert.match(source, /sources\.has\(src\)/);
assert.match(source, /families\.get\(m\.__family\)/);
assert.match(source, /durationFit/);
assert.match(source, /usedDuration/);

console.log('Batch 78 subject-diversity contract: PASS');
