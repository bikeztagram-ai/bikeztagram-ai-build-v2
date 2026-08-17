/* Unified facade for the Director, media intelligence, revision and campaign layers. */
import { buildContentBlueprint } from './contentBlueprint.js';
import { buildCreativeStory } from './creativeStoryEngine.js';
import { createCreativeProject } from './creativeProjectManifest.js';
import { buildCreativeDna } from './creativeDna.js';
import { buildExecutionPlan } from './creativeExecutionPlan.js';
import { rankMediaCandidates } from './mediaIntelligence.js';
import { deriveCampaign } from './campaignDerivation.js';

export function prepareCreativeProject(input = {}) {
  const subjectType = input.subjectType || 'general';
  const blueprint = buildContentBlueprint({ subjectType, goal: input.goal, audience: input.audience, platform: input.platform, mood: input.mood, duration: input.duration });
  const story = buildCreativeStory({ goal: input.goal, treatment: input.treatment, subjectType, duration: input.duration, audience: input.audience });
  const dna = buildCreativeDna(input.creativeDna || {});
  const rankedAssets = rankMediaCandidates(input.assets || [], input.mediaTarget || {});
  const manifest = createCreativeProject({ ...input, subject: { type: subjectType }, blueprint, story, creativeDna: dna, assets: rankedAssets });
  const execution = buildExecutionPlan(manifest);
  const campaign = deriveCampaign(manifest, input.outputs);
  return { manifest, rankedAssets, blueprint, story, creativeDna: dna, execution, campaign };
}
