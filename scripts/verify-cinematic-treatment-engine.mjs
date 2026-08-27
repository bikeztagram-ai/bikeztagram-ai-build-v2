import assert from 'node:assert/strict';
import { buildCinematicTreatments } from '../src/cinematicTreatment.js';
import { directCreativeRequest } from '../src/creativeDirectorV2.js';
import { createInternalTimeline, validateInternalTimeline } from '../src/videoEngine.js';

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

/* Verify the richer treatment survives the hand-off into executable runtime
 * cues instead of being silently replaced by generic motion/transitions. */
const timeline=createInternalTimeline({
  title:'cinematic treatment verification',
  scenes:plan.scenePlan.slots
},{});
const validation=validateInternalTimeline(timeline);
assert.equal(validation.valid,true,validation.errors.join('; '));
assert.equal(timeline.editorialContract.cinematicTreatmentsPreserved,true);
assert.equal(timeline.renderCues.length,plan.scenePlan.slots.length);
timeline.renderCues.forEach(cue=>{
  assert.ok(['static','cinematic','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down','orbit','parallax'].includes(cue.motion));
  assert.ok(['hard-cut','fade-in','fade-out','crossfade','flash-cut','dip-black','whip-left','whip-right','zoom-punch','light-leak','light-leak-left','light-leak-right'].includes(cue.transition));
});
console.log('Cinematic treatment engine + runtime hand-off contract: PASS');
