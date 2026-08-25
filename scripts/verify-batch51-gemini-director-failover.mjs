import assert from 'node:assert/strict';
import fs from 'node:fs';
const file=fs.readFileSync(new URL('../api/edit-plan.js',import.meta.url),'utf8');
assert.match(file,/gemini-3\.7-flash/); assert.match(file,/gemini-3\.6-flash/); assert.match(file,/gemini-3\.5-flash/); assert.match(file,/responseMimeType:\s*'application\/json'/);
assert.match(file,/\[404,\s*408,\s*425,\s*429,\s*500,\s*502,\s*503,\s*504\]\.includes\(response\.status\)/);
assert.match(file,/bestMoments/); assert.match(file,/momentIndex/); assert.match(file,/availableMoments/); assert.match(file,/Gemini director unavailable after model failover/);
console.log('batch51-gemini-director-failover: PASS');
