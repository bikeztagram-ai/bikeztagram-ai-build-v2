import assert from 'node:assert/strict';
import fs from 'node:fs';

const model = fs.readFileSync(new URL('../src/universalMediaModel.js', import.meta.url), 'utf8');
const planner = fs.readFileSync(new URL('../src/aiEditPlanner.js', import.meta.url), 'utf8');
const director = fs.readFileSync(new URL('../src/directorSelection.js', import.meta.url), 'utf8');

assert.match(model, /sourceIndex/);
assert.match(model, /mediaIndex: sourceIndex \?\? mediaIndex/);
assert.match(planner, /const sourceIndex\s*=/);
assert.match(planner, /moment\.sourceIndex/);
assert.match(planner, /mediaIndex:sourceIndex/);
assert.match(planner, /sourceIndex,/);
assert.match(director, /(?:function|const) sourceKey/);
assert.match(director, /mediaId\?\?m\.mediaIndex/);

console.log('Mixed-media source identity contract: PASS');
