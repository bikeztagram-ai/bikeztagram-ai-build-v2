/* BIKEZTAGRAM AI — executable no-Gemini Creative Engine facade. */
import { planCreativeFilm } from './creativeEngineRuntimeV2.js';
import { createCreativeRuntime, runCreativeStage, nextCreativeStage } from './creativeOrchestratorV2.js';
import { createNoGeminiRuntime, assertNoGeminiRuntime } from './noGeminiRuntimePolicy.js';
import { createOriginalPulseWav } from './musicProvider.js';
import { createVideoGenerationRequest } from './videoGenerationV2.js';

export function buildNoGeminiCreativePlan(input = {}) {
  const plan = planCreativeFilm(input);
  // The planner is intentionally retained as a provider-neutral contract.
  // Execution below is explicitly provider-free.
  return { ...plan, runtimePolicy: createNoGeminiRuntime() };
}

export function createNoGeminiCreativeRuntime(input = {}, adapters = {}) {
  assertNoGeminiRuntime(adapters);
  const plan = buildNoGeminiCreativePlan(input);
  const runtime = createCreativeRuntime({
    job: plan.job,
    adapters,
    maxAttempts: 3,
  });
  return { plan, runtime, runtimePolicy: createNoGeminiRuntime({ localAdapters: adapters }) };
}

export async function executeNoGeminiCreativeRuntime(runtime, context = {}) {
  let state = runtime;
  for (let guard = 0; guard < 9; guard += 1) {
    const stage = nextCreativeStage(state);
    if (stage === 'complete') break;
    state = await runCreativeStage(state, stage, context);
    if (state.stage === stage && Number(state.attempts?.[stage] || 0) >= Number(state.maxAttempts || 3)) break;
  }
  return state;
}

export function createLocalOriginalMusic(duration = 15, bpm = 112) {
  const blob = createOriginalPulseWav(duration, bpm);
  return { blob, source: 'local-original', bpm, duration };
}

export function createLocalSceneRequest({ prompt = '', duration = 3, aspectRatio = '9:16', subjectIds = [] } = {}) {
  return createVideoGenerationRequest({
    type: 'insert',
    prompt,
    duration,
    aspectRatio,
    subjectIds,
    timelineRole: 'insert',
  });
}
