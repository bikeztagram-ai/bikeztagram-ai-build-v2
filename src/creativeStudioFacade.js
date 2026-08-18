/* BIKEZTAGRAM AI — stable facade for the evolving creative stack. */
import { buildContentBlueprint } from './contentBlueprint.js';
import { buildCreativeStory } from './creativeStoryEngine.js';
import { buildContentCampaign } from './creativeBatchPlanner.js';
import { createCreativeDna } from './creativeDna.js';
import { buildExecutionPlan } from './creativeExecutionPlan.js';
import { buildRenderJob, validateRenderJob } from './creativeRenderBridge.js';
import { classifyRevision, buildRegenerationScope } from './creativeRevisionImpact.js';
import { planRevision } from './creativeRevisionLoop.js';
import { buildVisualLookPlan } from './visualLookPlan.js';
import { assessProjectHealth } from './projectHealth.js';
import { createPipelineRun } from './pipelineRun.js';
import { buildCampaignRunPlan } from './campaignRunPlan.js';
import { buildRepurposePlan } from './repurposePlanner.js';
import { evaluateRepurposedClip } from './repurposeQualityGate.js';
import { rankMediaCandidates } from './mediaIntelligence.js';
import { buildMultiPlatformPlans } from './autoReframePlan.js';

export function createCreativeStudioProject(input = {}) {
  const subjectType = input.subjectType || 'general';
  const intent = {
    subjectType,
    goal: input.goal || 'engage',
    audience: input.audience || 'general',
    platform: input.platform || 'reels',
    mood: input.mood || 'cinematic',
    duration: Math.max(3, Number(input.duration) || 30),
  };
  const blueprint = buildContentBlueprint(intent);
  const treatment = input.treatment || 'cinematic';
  const story = buildCreativeStory({ ...intent, treatment });
  const visualLook = buildVisualLookPlan({ lookId: input.lookId || 'cinematic-natural' });
  const dna = createCreativeDna(input.creativeDna || {});
  const assets = Array.isArray(input.assets) ? input.assets : [];
  const campaign = buildContentCampaign({ subjectType, platforms: input.platforms || [intent.platform] });
  const assetRanking = rankMediaCandidates(assets, { motion: input.motionTarget ?? 0.5 });
  const reframePlans = buildMultiPlatformPlans({
    platforms: input.platforms || ['reels', 'tiktok', 'youtube'],
    subject: input.subjectFocus || 'auto',
  });
  return {
    version: 2,
    intent,
    blueprint,
    story,
    treatment,
    visualLook,
    dna,
    assets,
    assetRanking,
    reframePlans,
    editPlan: input.editPlan || null,
    campaign,
  };
}

export function prepareCreativeExecution(project = {}, moments = [], options = {}) {
  const execution = buildExecutionPlan(project);
  const health = assessProjectHealth(project);
  const renderJob = buildRenderJob(project, execution);
  const renderValidation = validateRenderJob(renderJob);
  const campaign = buildCampaignRunPlan(project, options);
  const repurpose = buildRepurposePlan(project, moments, options.platforms || undefined);
  const approvedRepurpose = repurpose.filter((candidate) => evaluateRepurposedClip(candidate).passed);
  const run = createPipelineRun(project, execution);
  return { project, execution, health, renderJob, renderValidation, campaign, repurpose, approvedRepurpose, run, ready: health.ready && execution.ready && renderValidation.valid };
}

export function reviseCreativeProject(project = {}, feedback = '') {
  const revision = typeof feedback === 'string' ? classifyRevision(feedback) : feedback;
  const targeted = planRevision(project, feedback);
  return { project: { ...project, revision }, regeneration: buildRegenerationScope(revision, project), targeted };
}
