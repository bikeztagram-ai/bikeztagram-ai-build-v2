import assert from 'node:assert/strict';
import { evaluateCinematicOutput } from '../src/cinematicQualityEvaluator.js';
import { revisePlanAfterCinematicQuality } from '../src/renderQualityLoop.js';

const weak={creativePrompt:'fast cinematic reveal',targetDuration:20,cuts:[
  {duration:3,description:'same shot',role:'build',motionStyle:'static',transition:'hard-cut'},
  {duration:3,description:'same shot',role:'build',motionStyle:'static',transition:'hard-cut'},
  {duration:3,description:'same shot',role:'build',motionStyle:'static',transition:'hard-cut'},
  {duration:3,description:'same shot',role:'build',motionStyle:'static',transition:'hard-cut'}
]};
const quality=evaluateCinematicOutput(weak,{audio:{present:false}});
assert.equal(quality.verdict,'REJECT');
const revision=revisePlanAfterCinematicQuality(weak,quality);
assert.equal(revision.changed,true);
assert.ok(revision.reasons.length>0);
assert.equal(revision.plan.cuts[0].role,'hook');
assert.equal(revision.plan.cuts[2].role,'reveal');
assert.equal(revision.plan.cuts.at(-1).role,'hero-ending');
assert.ok(revision.plan.cuts.every(c=>c.duration<=4));
assert.ok(new Set(revision.plan.cuts.map(c=>c.motionStyle)).size>=3);
assert.ok(new Set(revision.plan.cuts.map(c=>c.transition)).size>=3);
assert.ok(new Set(revision.plan.cuts.map(c=>c.directorShotFamily)).size>=3);
assert.equal(revision.plan.cinematicQualityRevision.version,'cinematic-quality-revision-v3');
const improved=evaluateCinematicOutput(revision.plan,{audio:{present:false}});
assert.notEqual(improved.verdict,'REJECT');
assert.ok(improved.score>quality.score);
console.log('cinematic-quality-gate: PASS');
