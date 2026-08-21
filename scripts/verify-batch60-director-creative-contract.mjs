import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../src/aiEditPlanner.js',import.meta.url),'utf8');
for (const token of ['creativeMode','motionFor','transitionFor','speedFor','gradeFor','directorSelection']) assert.match(code,new RegExp(token));
assert.match(code,/directedMotion/);
assert.match(code,/directedTransition/);
assert.match(code,/motionIntensity/);
console.log('batch60-director-creative-contract: PASS');
