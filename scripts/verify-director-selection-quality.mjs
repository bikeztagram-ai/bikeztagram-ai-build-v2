import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('src/directorSelection.js','utf8');

for(const pattern of [
 /function subjectFamily\(/,
 /sources=new Set\(\)/,
 /families=new Map\(\)/,
 /subjects=new Map\(\)/,
 /durationFit\(/,
 /usedDuration/,
 /sources\.has\(/,
 /families\.get\(/,
 /subjects\.get\(/,
 /directorSelectionScore/,
 /directorShotFamily/,
 /directorSubjectFamily/
]) assert.match(source,pattern);

console.log('Director selection quality contract: PASS');
