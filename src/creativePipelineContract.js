/* BIKEZTAGRAM AI — stable contract for analyse-to-export orchestration. */

export const PIPELINE_STAGES = Object.freeze(['analyse','story','treatment','direct','generate','edit','enhance','sound','quality','render','export']);

export function createPipelineState(project = {}) {
  return {
    version: 1,
    projectId: project.id || null,
    stages: PIPELINE_STAGES.map((id) => ({ id, status: id === 'analyse' && project.assets ? 'ready' : 'pending', attempts: 0, error: null })),
    status: 'pending',
  };
}

export function advancePipeline(state, id, result = {}) {
  if (!PIPELINE_STAGES.includes(id)) throw new Error(`Unknown pipeline stage: ${id}`);
  const stages = state.stages.map((stage) => stage.id === id ? { ...stage, status: result.error ? 'failed' : 'complete', attempts: stage.attempts + 1, error: result.error || null } : stage);
  const failed = stages.some((stage) => stage.status === 'failed');
  const complete = stages.every((stage) => stage.status === 'complete');
  return { ...state, stages, status: failed ? 'blocked' : complete ? 'complete' : 'running' };
}
