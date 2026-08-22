import assert from 'node:assert/strict';
import { buildCreativeExecutionPlan, validateExecutionPlan, executeCreativePlan } from '../src/creativeEngineOrchestrator.js';
import { createCreativeJob } from '../src/creativeEngineControlPlane.js';

const job = createCreativeJob({ request: 'Create a cinematic motorcycle trailer', assets: [{ name: 'bike.mp4', type: 'video/mp4' }] });
const plan = buildCreativeExecutionPlan(job, [
  { id: 'local-music', kinds: ['music'], local: true, priority: 1 },
  { id: 'local-video', kinds: ['video'], local: true, priority: 1 },
]);
assert.equal(validateExecutionPlan(plan).ok, true);
assert.equal(plan.workers.music.id, 'local-music');
assert.equal(plan.workers.video.id, 'local-video');

const stages = [];
const result = await executeCreativePlan(plan, {
  music: async () => ({ track: 'original' }),
  video: async () => [{ scene: 'generated' }],
  assemble: async ({ plan }) => ({ scenes: plan.job.outputs.scenes }),
  render: async () => ({ ready: true }),
  qa: async () => ({ score: 0.95 }),
}, { onStage: (stage, state) => stages.push(`${stage}:${state}`) });

assert.equal(result.status, 'complete');
assert.equal(result.outputs.render.ready, true);
assert.equal(result.outputs.qa.score, 0.95);
assert.ok(stages.includes('music:start'));
assert.ok(stages.includes('qa:complete'));

console.log('creative-orchestrator: PASS');
