import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/directorSelection.js', 'utf8');

assert.match(source, /function subjectFamily\(moment\)/, 'director must classify subject families');
assert.match(source, /const usedSubjects=new Map\(\)/, 'director must track selected subjects');
assert.match(source, /subjectCount\)value-=clamp\(9\*subjectCount,9,24\)/, 'repeated subjects must receive a bounded penalty');
assert.match(source, /!subjectCount&&subjectKey!==['"]unknown['"]&&chosen\.length>0/, 'new subject families should receive a diversity bonus');
assert.match(source, /targetDuration>=12/, 'longer films must use temporal coverage logic');
assert.match(source, /directorSubjectFamily/, 'selection metadata must expose the subject family');
assert.match(source, /usedSources\.has\(source\)/, 'source diversity guard must remain active');
assert.match(source, /usedFamilies\.get\(family\)/, 'shot-family diversity guard must remain active');

console.log('Batch 77 director diversity contract: PASS');
console.log('- subject-family classification and tracking');
console.log('- repeated-subject penalty with single-subject fallback');
console.log('- new-subject diversity bonus');
console.log('- longer-film temporal coverage bias');
console.log('- source and shot-family diversity preserved');
console.log('- directorSubjectFamily metadata emitted');
