/* BIKEZTAGRAM AI — stable facade for the evolving creative stack. */
import { buildContentBlueprint } from './contentBlueprint.js';
import { buildCreativeStory } from './creativeStoryEngine.js';
import { buildContentCampaign } from './creativeBatchPlanner.js';
import { createCreativeDna } from './creativeDna.js';
import { buildExecutionPlan } from './creativeExecutionPlan.js';
import { classifyRevision, buildRegenerationScope } from './creativeRevisionImpact.js';
import { buildVisualLookPlan } from './visualLookPlan.js';

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
  const campaign = buildContentCampaign({ subjectType, platforms: input.platforms || [intent.platform] });
  return { version: 1, intent, blueprint, story, treatment, visualLook, dna, assets: input.assets || [], editPlan: input.editPlan || null, campaign };
}

export function prepareCreativeExecution(project) {
  return { project, execution: buildExecutionPlan(project) };
}

export function reviseCreativeProject(project, feedback) {
  const revision = typeof feedback === 'string' ? classifyRevision(feedback) : feedback;
  return { project: { ...project, revision }, regeneration: buildRegenerationScope(revision, project) };
}
