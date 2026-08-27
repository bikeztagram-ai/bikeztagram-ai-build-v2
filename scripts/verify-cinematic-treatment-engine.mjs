import assert from 'node:assert/strict';
import { buildCinematicTreatments } from '../src/cinematicTreatment.js';
import { directCreativeRequest } from '../src/creativeDirectorV2.js';

const treatments=buildCinematicTreatments({
  creativePrompt:'cinematic trailer with fast action and a dramatic reveal',
  targetDuration:15,
  moments:[
    {role:'hook',subjectType:'vehicle',duration:3},
    {role:'action',subjectType:'vehicle',duration:3},
    {role:'reveal',subjectType:'vehicle',duration:4},
    {role:'hero',subjectType:'vehicle',duration:4}
  ]
});
assert.equal(treatments.version,'cinematic-treatment-v1');
assert.equal(treatments.items.length,4);
assert.equal(treatments.items[0].cinematicTreatment.motion,'push-in');
assert.equal(treatments.items[1].cinematicTreatment.motion,'speed-ramp');
assert.equal(treatments.items[2].cinematicTreatment.motion,'slow-orbit');
assert.equal(treatments.items[3].cinematicTreatment.transition,'fade');
assert.ok(treatments.totalDuration<=15.01);

const plan=directCreativeRequest({prompt:'cinematic motorcycle reveal',assets:[],duration:15,aspectRatio:'9:16'});
assert.equal(plan.version,'creative-direction-v2');
assert.equal(plan.cinematicTreatments.version,'cinematic-treatment-v1');
assert.equal(plan.scenePlan.treatmentVersion,'cinematic-treatment-v1');
assert.ok(Array.isArray(plan.scenePlan.slots));
plan.scenePlan.slots.forEach(slot=>assert.ok(slot.cinematicTreatment));
console.log('Cinematic treatment engine contract: PASS');
