import { buildExecutionPlan } from './creativeExecutionPlan.js';
import { buildRenderJob, validateRenderJob } from './creativeRenderBridge.js';
import { buildRepurposePlan } from './repurposePlanner.js';
import { evaluateRepurposedClip } from './repurposeQualityGate.js';

export function orchestrateCreativeProject(project = {}, moments = [], options = {}) {
  const execution = buildExecutionPlan(project);
  const renderJob = buildRenderJob(project, execution);
  const renderValidation = validateRenderJob(renderJob);
  const candidates = buildRepurposePlan(project, moments, options.platforms || ['reels', 'tiktok', 'shorts']);
  const accepted = candidates.filter((candidate) => evaluateRepurposedClip(candidate).passed);
  return {
    version: 1,
    projectId: project.id || null,
    ready: execution.ready && renderValidation.valid,
    execution,
    renderJob,
    renderValidation,
    repurpose: { candidates, accepted },
    blockers: [...execution.errors, ...renderValidation.errors],
  };
}
