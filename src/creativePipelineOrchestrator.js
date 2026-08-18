import { buildExecutionPlan } from './creativeExecutionPlan.js';
import { buildRenderJob, validateRenderJob } from './creativeRenderBridge.js';
import { buildRepurposePlan } from './repurposePlanner.js';
import { evaluateRepurposedClip } from './repurposeQualityGate.js';
import { validateEditPlan, normalizeVerifiedEditPlan } from './editPlanQualityGate.js';
import { createTimeline, validateTimeline } from './timelineModel.js';

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

const STAGES = Object.freeze(['analyse','direct','edit','quality','reframe','export']);

export function buildCreativePipeline(project = {}, moments = [], options = {}) {
  const editPlan = project.editPlan || null;
  const quality = editPlan ? validateEditPlan(editPlan, moments) : { valid: false, errors: ['No edit plan supplied.'], warnings: [], normalizedCuts: [], metrics: { cutCount: 0, uniqueMoments: 0, duration: 0 } };
  const normalizedEditPlan = editPlan && quality.normalizedCuts.length ? normalizeVerifiedEditPlan(editPlan, moments) : editPlan;
  const timeline = normalizedEditPlan ? createTimeline(normalizedEditPlan) : null;
  const timelineValidation = timeline ? validateTimeline(timeline) : { valid: false, errors: ['No timeline can be created without an edit plan.'] };
  const stages = STAGES.map((id) => ({
    id,
    status: id === 'analyse' ? (project.assets?.length ? 'ready' : 'pending')
      : id === 'direct' ? (project.story || project.blueprint ? 'ready' : 'pending')
      : id === 'edit' ? (editPlan ? 'ready' : 'pending')
      : id === 'quality' ? (quality.valid && timelineValidation.valid ? 'ready' : 'blocked')
      : id === 'reframe' ? (project.reframePlans?.length ? 'ready' : 'pending')
      : id === 'export' ? (project.output || project.outputs ? 'ready' : 'pending')
      : 'pending',
  }));
  const ready = Boolean(project.assets?.length && (project.story || project.blueprint) && editPlan && quality.valid && timelineValidation.valid);
  return {
    version: 2,
    ready,
    stages,
    editPlan: normalizedEditPlan,
    quality,
    timeline,
    timelineValidation,
    policy: {
      sourceOfTruth: 'verified-video-analysis',
      nonDestructive: true,
      preserveExistingTimeline: true,
      allowInventedFootage: false,
      outputMode: options.outputMode || 'social-video',
    },
  };
}

export function getPipelineBlockers(pipeline = {}) {
  return (pipeline.stages || []).filter((stage) => stage.status === 'blocked' || stage.status === 'pending').map((stage) => stage.id);
}
