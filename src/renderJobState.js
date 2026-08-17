/* BIKEZTAGRAM AI — deterministic render state, independent of storage provider. */

export const RENDER_STATES = Object.freeze(['queued','preparing','rendering','reviewing','complete','failed','cancelled']);

export function createRenderJob(input = {}) {
  return { id: input.id || `render-${Date.now()}`, projectId: input.projectId || null, state: 'queued', progress: 0, attempt: 0, error: null, output: null, updatedAt: new Date().toISOString() };
}

export function transitionRenderJob(job, nextState, patch = {}) {
  if (!RENDER_STATES.includes(nextState)) throw new Error('Invalid render state.');
  const allowed = { queued:['preparing','cancelled'], preparing:['rendering','failed','cancelled'], rendering:['reviewing','failed','cancelled'], reviewing:['complete','rendering','failed'], complete:[], failed:['preparing','cancelled'], cancelled:[] };
  if (!allowed[job.state]?.includes(nextState)) throw new Error(`Invalid render transition: ${job.state} -> ${nextState}`);
  return { ...job, ...patch, state: nextState, attempt: nextState === 'rendering' ? job.attempt + 1 : job.attempt, updatedAt: new Date().toISOString() };
}
