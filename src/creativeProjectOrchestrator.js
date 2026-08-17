/* BIKEZTAGRAM AI — canonical orchestration layer. Keeps storage/generation adapters isolated. */

import { createCreativeDna } from './creativeDna.js';
import { buildContentBlueprint } from './contentBlueprint.js';
import { buildCreativeStory } from './creativeStoryEngine.js';
import { buildReferenceTreatment } from './referenceMatchPlanner.js';
import { buildDirectorEditPlan } from './directorEditPlanner.js';
import { scoreCreativePlan, createCreativeAgentState } from './creativeAgentLoop.js';
import { buildContentCampaign } from './creativeBatchPlanner.js';

export function createCreativeProject(input = {}) {
  const subjectType = input.subjectType || 'general';
  const treatment = input.treatment || 'cinematic';
  const intent = { goal: input.goal || 'engage', audience: input.audience || 'general', platform: input.platform || 'reels', duration: Number(input.duration) || 30, subjectType };
  const story = buildCreativeStory({ goal: intent.goal, treatment, subjectType, duration: intent.duration, audience: intent.audience });
  const blueprint = buildContentBlueprint({ ...intent, mood: input.mood || 'cinematic' });
  const referenceTreatment = input.reference ? buildReferenceTreatment(input.reference, input.referenceOverrides) : null;
  const editPlan = buildDirectorEditPlan({ assets: input.assets || [], duration: intent.duration, mood: input.mood || 'cinematic', platform: intent.platform, lookId: input.lookId || 'cinematic-natural', music: input.music, captions: input.captions !== false });
  const plan = { story, blueprint, treatment: referenceTreatment || { version: 1, treatment }, editPlan };
  const evaluation = scoreCreativePlan(plan, { hasAssets: (input.assets || []).length > 0, platformReady: Boolean(intent.platform) });
  return { version: 1, id: input.id || null, intent, assets: input.assets || [], dna: createCreativeDna(input.dna), plan, evaluation, agent: createCreativeAgentState({ goal: intent.goal, plan }), campaign: buildContentCampaign({ projectId: input.id || null, subjectType }) };
}
