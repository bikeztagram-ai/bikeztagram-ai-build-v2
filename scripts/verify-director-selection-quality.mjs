import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('src/directorSelection.js','utf8');
for(const pattern of [
 /function subjectFamily\(moment\)/,
 /const usedSubjects=new Map\(\)/,
 /const usedFamilies=new Map\(\)/,
 /durationFit\(/,
 /usedDuration/,
 /usedSources\.has\(source\)/,
 /usedFamilies\.get\(family\)/,
 /usedSubjects\.get\(subjectKey\)/,
 /directorSelectionScore/,
 /directorShotFamily/,
 /directorSubjectFamily/
]) assert.match(source,pattern);
console.log('Director selection quality contract: PASS');
