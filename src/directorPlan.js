/* BIKEZTAGRAM AI — universal product-layer Director pass. Protected upload/Gemini pipeline untouched. */
import { createAIEditPlan, describeAIEditPlan } from './aiEditPlanner.js';
import { critiqueAndImproveTimeline, describeCritique } from './editCritic.js';
import { buildUniversalProductionBlueprint, describeBlueprint } from './universalProductionBlueprint.js';

export function createDirectedEditPlan(analysis, options = {}) {
  const blueprint = buildUniversalProductionBlueprint(analysis, options.creativePrompt || '', { targetDuration: options.targetDuration || 15 });
  const enrichedAnalysis = { ...analysis, productionBlueprint: blueprint };
  const base = createAIEditPlan(enrichedAnalysis, options);
  if (!base?.cuts?.length) return { ...base, productionBlueprint: blueprint, blueprintSummary: describeBlueprint(blueprint) };
  const prompt = options.creativePrompt || '';
  const flags = {
    action: /action|chase|race|speed|pursuit|aggressive|energetic/i.test(prompt),
    emotional: /emotional|romantic|beautiful|nostalgic|heartfelt|cute|joy/i.test(prompt),
    dark: /dark|night|moody|horror|noir/i.test(prompt),
    comedy: /funny|comedy|comic|meme/i.test(prompt)
  };
  const critique = critiqueAndImproveTimeline(base.cuts, { flags });
  return {
    ...base,
    productionBlueprint: blueprint,
    blueprintSummary: describeBlueprint(blueprint),
    cuts: critique.cuts,
    duration: critique.cuts.reduce((sum, cut) => sum + Number(cut.duration || 0), 0),
    qualityScore: critique.after.score,
    qualityReport: describeCritique(critique),
    directorPass: 'universal-production-director-v2'
  };
}

export function describeDirectedEditPlan(plan) {
  if (!plan) return 'No AI edit plan available.';
  return `${describeAIEditPlan(plan)} • ${plan.blueprintSummary || ''} • ${plan.qualityReport || ''}`;
}
