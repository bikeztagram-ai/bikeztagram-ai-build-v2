// Bikeztagram AI — Creative Engine orchestration facade.
// Keeps orchestration deterministic and testable while leaving provider/runtime
// implementations swappable. No network calls are made by this module.

import { planCreativeParallelism, selectWorker, checkpointCreativeJob, recordGenerationEvidence, finaliseCreativeSnapshot } from './creativeEngineControlPlane.js';

export function buildCreativeExecutionPlan(job, workers = []) {
  const planned = planCreativeParallelism(job);
  const musicWorker = selectWorker(workers, 'music');
  const videoWorker = selectWorker(workers, 'video');

  return {
    job: planned,
    workers: { music: musicWorker, video: videoWorker },
    parallel: planned.parallelJobs,
    executable: Boolean(musicWorker || videoWorker),
  };
}

export function validateExecutionPlan(plan) {
  const failures = [];
  if (!plan?.job?.id) failures.push('missing-job');
  if (!plan?.workers) failures.push('missing-workers');
  if (!Array.isArray(plan?.parallel) || plan.parallel.length !== 2) failures.push('parallel-jobs-not-ready');
  return { ok: failures.length === 0, failures };
}

export async function executeCreativePlan(plan, adapters = {}, { onStage } = {}) {
  const validation = validateExecutionPlan(plan);
  if (!validation.ok) throw new Error(`Creative execution plan invalid: ${validation.failures.join(', ')}`);

  let job = checkpointCreativeJob(plan.job, 'music+scenes');
  const runStage = async (name, fn, fallback = null) => {
    onStage?.(name, 'start');
    const result = typeof fn === 'function' ? await fn({ job, plan }) : fallback;
    job = recordGenerationEvidence(job, { kind: name, configured: typeof fn === 'function', result: result == null ? 'none' : 'completed' });
    onStage?.(name, 'complete');
    return result;
  };

  const [music, scenes] = await Promise.all([
    runStage('music', adapters.music),
    runStage('video', adapters.video, []),
  ]);

  job.outputs.music = music;
  job.outputs.scenes = scenes || [];
  job = checkpointCreativeJob(job, 'assemble', { musicReady: Boolean(music), scenesReady: Array.isArray(scenes) });

  const timeline = await runStage('assemble', adapters.assemble, { music, scenes: scenes || [] });
  job.outputs.timeline = timeline;
  job = checkpointCreativeJob(job, 'render', { timelineReady: Boolean(timeline) });

  const render = await runStage('render', adapters.render);
  job.outputs.render = render;
  const qa = await runStage('qa', adapters.qa, { score: 1 });
  job.outputs.qa = qa;

  return finaliseCreativeSnapshot(job, { timeline, render, qa });
}
