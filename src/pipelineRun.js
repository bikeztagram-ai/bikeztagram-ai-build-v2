import { recoveryAction } from './pipelineRecovery.js';

const MAX_RETRIES = 3;

export function createPipelineRun(project = {}, plan = {}) {
  return {
    id: project.id ? `run-${project.id}` : 'run-new',
    projectId: project.id || null,
    status: 'queued',
    cursor: 0,
    stages: (plan.stages || []).map((stage) => ({ ...stage, status: stage.status || 'pending', attempts: 0 })),
    outputs: [],
  };
}

export function advancePipelineRun(run = {}, result = {}) {
  const stages = [...(run.stages || [])];
  const current = stages[run.cursor];
  if (!current) return { ...run, status: 'complete' };

  const attempts = (current.attempts || 0) + 1;
  const error = result.error || null;
  const recovery = error ? recoveryAction(error) : null;
  const exhausted = Boolean(error && recovery?.action === 'retry' && attempts >= MAX_RETRIES);

  stages[run.cursor] = {
    ...current,
    status: error ? (exhausted ? 'failed' : 'retrying') : 'complete',
    attempts,
    error,
    recovery,
  };

  if (error && recovery?.action === 'retry' && !exhausted) {
    return { ...run, stages, status: 'retrying' };
  }

  return {
    ...run,
    stages,
    cursor: error ? run.cursor : run.cursor + 1,
    status: error ? 'blocked' : 'running',
  };
}
