import assert from 'node:assert/strict';
import fs from 'node:fs';
const api=fs.readFileSync(new URL('../api/edit-plan.js',import.meta.url),'utf8');
const production=fs.readFileSync(new URL('../api/production-plan.js',import.meta.url),'utf8');
const adapter=fs.readFileSync(new URL('../src/twoStageDirector.js',import.meta.url),'utf8');
assert.match(api,/TARGET DURATION/);assert.match(api,/Do not repeat the same exact moment/);assert.match(api,/const seen=new Set/);assert.match(api,/plan\.targetDuration=target/);assert.match(api,/sourceSelection/);
assert.match(production,/stage2Director/);assert.match(production,/Stage 2 Gemini/);assert.match(production,/deterministic-fallback/);assert.match(production,/Stage 1 actual-video analysis is the source of truth/);assert.match(production,/generated-environment-fill/);assert.match(production,/sourceSelection/);
assert.match(adapter,/Stage 1 analysed the actual uploaded video/);assert.match(adapter,/sourceType: 'uploaded'/);assert.match(adapter,/generatedScenesAllowed: false/);
console.log('batch6-two-stage-director: PASS');
