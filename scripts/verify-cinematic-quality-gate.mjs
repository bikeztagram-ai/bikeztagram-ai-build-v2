import assert from 'node:assert/strict';
import { evaluateCinematicOutput } from '../src/cinematicQualityEvaluator.js';
import { revisePlanAfterCinematicQuality } from '../src/renderQualityLoop.js';

const weak={creativePrompt:'fast cinematic reveal',targetDuration:12,cuts:[
  {duration:3,description:'same shot',role:'build'},
  {duration:3,description:'same shot',role:'build'},
  {duration:3,description:'same shot',role:'build'},
  {duration:3,description:'same shot',role:'build'}
]};
const quality=evaluateCinematicOutput(weak,{audio:{present:false}});
assert.equal(quality.verdict,'REJECT');
const revision=revisePlanAfterCinematicQuality(weak,quality);
assert.equal(revision.changed,true);
assert.ok(revision.reasons.length>0);
assert.equal(revision.plan.cuts[0].role,'hook');
assert.equal(revision.plan.cuts.at(-1).role,'hero-ending');
assert.ok(revision.plan.cuts.every(c=>c.duration<=4));
console.log('cinematic-quality-gate: PASS');
