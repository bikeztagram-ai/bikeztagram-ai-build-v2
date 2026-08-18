import assert from 'node:assert/strict';
import { createCreativeStudioProject, prepareCreativeExecution } from '../src/creativeStudioFacade.js';
import { createPipelineRun, advancePipelineRun } from '../src/pipelineRun.js';
import { recoveryAction } from '../src/pipelineRecovery.js';
import { collectPipelineOutput, appendOutput } from '../src/pipelineOutputCollector.js';
import { validateCreativeStudioResult } from '../src/creativeStudioContract.js';
import { validateEditPlan } from '../src/editPlanQualityGate.js';
import { buildCreativePipeline, getPipelineBlockers } from '../src/creativePipelineOrchestrator.js';
import { buildRenderJob, validateRenderJob } from '../src/creativeRenderBridge.js';

const plan = { stages: [{ id: 'analyse' }, { id: 'direct' }, { id: 'generate' }] };
let run = createPipelineRun({ id: 'regression' }, plan);
assert.equal(run.status, 'queued');
run = advancePipelineRun(run, {});
assert.equal(run.cursor, 1);
run = advancePipelineRun(run, { error: { kind: 'timeout' } });
assert.equal(run.status, 'retrying');
assert.equal(run.stages[1].recovery.action, 'retry');
run = advancePipelineRun(run, { error: { kind: 'timeout' } });
assert.equal(run.status, 'retrying');
run = advancePipelineRun(run, { error: { kind: 'timeout' } });
assert.equal(run.status, 'blocked');
assert.equal(run.stages[1].attempts, 3);
assert.equal(run.stages[1].status, 'failed');
assert.deepEqual(recoveryAction({ kind: 'timeout' }), { action: 'retry', preserve: true });
assert.deepEqual(recoveryAction({ kind: 'invalid_input' }), { action: 'fix_input', preserve: true });

const pending = collectPipelineOutput({ id: 'o1', url: 'https://example.test/pending.mp4' }, 'hero');
assert.equal(pending.status, 'pending');
const ready = collectPipelineOutput({ id: 'o2', url: 'https://example.test/o2', mime: 'video/mp4', status: 'ready' }, 'reel');
assert.equal(ready.status, 'ready');
const failed = collectPipelineOutput({ id: 'o3', url: 'https://example.test/o3', status: 'failed' }, 'reel');
assert.equal(failed.status, 'failed');
assert.equal(appendOutput(run, ready, 'reel').outputs.length, 1);

const project = createCreativeStudioProject({ subjectType: 'general', assets: [{ id: 'a1' }] });
const prepared = prepareCreativeExecution(
  { ...project, editPlan: { tracks: { video: [{ id: 'shot-1', start: 0, duration: 3 }] } }, output: { width: 1080, height: 1920, fps: 30 } },
  [],
  { outputs: ['hero'] },
);
assert.equal(validateCreativeStudioResult(prepared).valid, true);
assert.equal(validateCreativeStudioResult({ ...prepared, execution: { ...prepared.execution, ready: false } }).valid, false);
assert.equal(validateCreativeStudioResult({ ...prepared, health: { ...prepared.health, ready: false } }).valid, false);
assert.equal(validateCreativeStudioResult({ ...prepared, renderValidation: { valid: false } }).valid, false);
assert.equal(validateCreativeStudioResult({ ...prepared, run: { ...prepared.run, status: 'blocked' } }).valid, false);
assert.equal(validateCreativeStudioResult({ ...prepared, run: { ...prepared.run, outputs: [failed] } }).valid, false);
assert.deepEqual(validateCreativeStudioResult({}), {
  valid: false,
  errors: ['Missing execution plan.', 'Missing project health.', 'Missing render job.', 'Missing campaign plan.', 'Missing pipeline run.'],
});

const moments = [
  { start: 0, end: 3 },
  { start: 4, end: 8 },
  { start: 9, end: 13 },
];
const verifiedPlan = {
  cuts: [
    { momentIndex: 0, startTime: 0, endTime: 2, duration: 2, speed: 1, transition: 'hard-cut', motionStyle: 'static' },
    { momentIndex: 1, startTime: 4, endTime: 7, duration: 2, speed: 1, transition: 'whip-right', motionStyle: 'slow-push' },
    { momentIndex: 2, startTime: 9, endTime: 12, duration: 2, speed: 1, transition: 'hard-cut', motionStyle: 'pan-left' },
  ],
};
const quality = validateEditPlan(verifiedPlan, moments);
assert.equal(quality.valid, true);
assert.equal(quality.metrics.uniqueMoments, 3);
assert.equal(quality.metrics.duration, 6);

const verifiedProject = { ...project, story: project.story, editPlan: verifiedPlan, output: { width: 1080, height: 1920, fps: 30 } };
const pipeline = buildCreativePipeline(verifiedProject, moments);
assert.equal(pipeline.ready, true);
assert.equal(pipeline.policy.nonDestructive, true);
assert.equal(pipeline.policy.allowInventedFootage, false);
assert.equal(pipeline.quality.valid, true);
assert.equal(pipeline.quality.mode, 'verified-two-stage');
assert.equal(pipeline.timelineValidation.valid, true);
assert.equal(pipeline.timeline.tracks.video.length, 3);
assert.equal(pipeline.timeline.tracks.video[0].trimIn, 0);
assert.equal(pipeline.timeline.tracks.video[1].trimIn, 4);
assert.equal(pipeline.timeline.tracks.video[2].trimIn, 9);
assert.deepEqual(getPipelineBlockers(pipeline), []);

const renderJob = buildRenderJob(verifiedProject, {});
assert.equal(validateRenderJob(renderJob).valid, true);
assert.equal(renderJob.timeline.tracks.video.length, 3);
assert.equal(renderJob.timeline.tracks.video[1].trimIn, 4);
assert.equal(renderJob.timeline.tracks.video[1].transition, 'whip-right');

console.log('pipeline-contracts: PASS');
