import assert from 'node:assert/strict';
import { evaluateCinematicOutput } from '../src/cinematicQualityEvaluator.js';
import { revisePlanAfterCinematicQuality } from '../src/renderQualityLoop.js';

const weakPlan = {
  creativePrompt: 'fast cinematic reveal',
  targetDuration: 12,
  cuts: [
    { duration: 6, description: 'same shot', role: 'hook' },
    { duration: 6, description: 'same shot', role: 'build' }
  ]
};
const quality = evaluateCinematicOutput(weakPlan, { audio: { present: true } });
assert.equal(quality.verdict, 'REJECT');

const revision = revisePlanAfterCinematicQuality(weakPlan, quality);
assert.equal(revision.changed, true);
assert.ok(revision.reasons.length > 0);
assert.ok(revision.plan.cinematicQualityRevision);
assert.equal(revision.plan.cuts[0].role, 'hook');
assert.equal(revision.plan.cuts.at(-1).role, 'hero-ending');
assert.ok(revision.plan.cuts.every((cut) => cut.duration <= 4));

console.log('cinematic-quality-gate: PASS');
