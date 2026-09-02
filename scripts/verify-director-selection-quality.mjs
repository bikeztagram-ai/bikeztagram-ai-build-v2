import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('src/directorSelection.js','utf8');

for(const pattern of [
 /function subjectFamily\(m\)/,
 /const sources=new Set\(\)/,
 /const families=new Map\(\)/,
 /const subjects=new Map\(\)/,
 /durationFit\(/,
 /usedDuration/,
 /sources\.has\(src\)/,
 /families\.get\(m\.__family\)/,
 /subjects\.get\(m\.__subject\)/,
 /directorSelectionScore/,
 /directorShotFamily/,
 /directorSubjectFamily/
]) assert.match(source,pattern);

console.log('Director selection quality contract: PASS');
