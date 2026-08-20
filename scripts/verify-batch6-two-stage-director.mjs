import assert from 'node:assert/strict';
import fs from 'node:fs';
const api=fs.readFileSync(new URL('../api/edit-plan.js',import.meta.url),'utf8');
const adapter=fs.readFileSync(new URL('../src/twoStageDirector.js',import.meta.url),'utf8');
assert.match(api,/TARGET DURATION/);assert.match(api,/Do not repeat the same exact moment/);assert.match(api,/const seen=new Set/);assert.match(api,/plan\.targetDuration=target/);assert.match(api,/sourceSelection/);
assert.match(adapter,/Stage 1 analysed the actual uploaded video/);assert.match(adapter,/sourceType: 'uploaded'/);assert.match(adapter,/generatedScenesAllowed: false/);
console.log('batch6-two-stage-director: PASS');
