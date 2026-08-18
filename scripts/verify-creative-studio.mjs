import assert from 'node:assert/strict';
import { createCreativeStudioProject, prepareCreativeExecution, reviseCreativeProject } from '../src/creativeStudioFacade.js';
import { validateCreativeStudioResult } from '../src/creativeStudioContract.js';

const project = createCreativeStudioProject({
  subjectType: 'travel',
  goal: 'launch',
  duration: 30,
  assets: [{ id: 'a1', sharpness: 0.9, composition: 0.8, subjectVisibility: 0.95, motionQuality: 0.7, audioQuality: 0.8 }],
});
assert.equal(project.intent.subjectType, 'travel');
assert.ok(project.story);
assert.ok(project.campaign?.deliverables?.length > 0);
assert.equal(project.assetRanking[0].id, 'a1');
assert.ok(project.assetRanking[0].score > 0.8);
assert.deepEqual(project.reframePlans.map((plan) => plan.platform), ['reels', 'tiktok', 'youtube']);

const executable = { ...project, editPlan: { tracks: { video: [{ id: 'shot-1', start: 0, duration: 3 }] } }, output: { width: 1080, height: 1920, fps: 30 } };
const prepared = prepareCreativeExecution(executable, [{ id: 'm1', score: .9, hook: 'strong', sourceMomentId: 'a1' }], { outputs: ['hero', 'reel'] });
assert.ok(prepared.execution);
assert.equal(prepared.execution.readiness.hasAssets, true);
assert.equal(prepared.execution.readiness.hasShots, true);
assert.equal(prepared.execution.readiness.hasEditPlan, true);
assert.equal(prepared.execution.readiness.hasOutputs, true);
assert.equal(prepared.execution.readiness.hasCampaign, true);
assert.equal(prepared.health.ready, true);
assert.equal(prepared.renderValidation.valid, true);
assert.equal(prepared.renderJob.timeline.version, 1);
assert.equal(prepared.campaign.length, 2);
assert.ok(prepared.run.stages.length > 0);
assert.equal(prepared.pipeline.ready, true);
assert.equal(prepared.pipeline.policy.nonDestructive, true);
assert.equal(validateCreativeStudioResult(prepared).valid, true);
assert.equal(validateCreativeStudioResult({ ...prepared, pipeline: { ...prepared.pipeline, ready: false } }).valid, false);

const revision = reviseCreativeProject(executable, 'make it darker and faster');
assert.ok(revision.regeneration.stages.includes('look'));
assert.ok(revision.regeneration.stages.includes('edit'));
assert.ok(revision.targeted);

console.log('creative-studio: PASS');
