/* Bikeztagram AI Creative Job Orchestrator.
   Deterministic state machine for future autonomous generation. It intentionally contains
   no model/provider calls; adapters are injected by the application. */

const STAGES = ['analyse', 'direct', 'generate-music', 'generate-scenes', 'assemble', 'render', 'qa', 'revise', 'export'];

export function createCreativeJobState(job) {
  return {
    version: 'creative-job-state-v1',
    job,
    stage: 'analyse',
    completed: [],
    attempts: {},
    errors: [],
    outputs: {},
    startedAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function advanceCreativeJob(state, stage, output = null) {
  if (!STAGES.includes(stage)) throw new Error(`Unknown creative job stage: ${stage}`);
  const completed = [...new Set([...(state.completed || []), stage])];
  const index = STAGES.indexOf(stage);
  const next = STAGES[index + 1] || 'complete';
  return {
    ...state,
    stage: next,
    completed,
    outputs: output == null ? state.outputs : { ...state.outputs, [stage]: output },
    updatedAt: Date.now()
  };
}

export function failCreativeJob(state, stage, error) {
  return {
    ...state,
    stage,
    errors: [...(state.errors || []), { stage, message: error?.message || String(error), at: Date.now() }],
    attempts: { ...(state.attempts || {}), [stage]: Number(state.attempts?.[stage] || 0) + 1 },
    updatedAt: Date.now()
  };
}

export function canRetryCreativeJob(state, stage, maxAttempts = 3) {
  return Number(state?.attempts?.[stage] || 0) < Math.max(1, maxAttempts);
}

export function getCreativeJobProgress(state) {
  const completed = Array.isArray(state?.completed) ? state.completed.length : 0;
  return { stage: state?.stage || 'analyse', completed, total: STAGES.length, percent: Math.round((completed / STAGES.length) * 100), stages: STAGES };
}
