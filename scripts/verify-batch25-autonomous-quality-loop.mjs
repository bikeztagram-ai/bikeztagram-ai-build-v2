import assert from 'node:assert/strict';
import fs from 'node:fs';

const production=fs.readFileSync(new URL('../api/production-plan.js',import.meta.url),'utf8');
const critic=fs.readFileSync(new URL('../src/editCritic.js',import.meta.url),'utf8');

assert.match(production,/critiqueAndImproveTimeline/);
assert.match(production,/timeline-critic-v1/);
assert.match(production,/beforeScore/);
assert.match(production,/afterScore/);
assert.match(production,/minimumAcceptedScore:90/);
assert.match(production,/preserve its quality metadata/);
assert.match(critic,/critiqueAndImproveTimeline/);
assert.match(critic,/strengthened story roles/);
assert.doesNotMatch(production,/motorcycleModel|ninja1000|kawasaki/i);

console.log('batch25-autonomous-quality-loop: PASS');
