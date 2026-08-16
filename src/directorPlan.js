/* BIKEZTAGRAM AI — product-layer Director pass. Protected upload/Gemini pipeline untouched. */
import { createAIEditPlan, describeAIEditPlan } from './aiEditPlanner.js';
import { critiqueAndImproveTimeline, describeCritique } from './editCritic.js';

export function createDirectedEditPlan(analysis, options = {}) {
  const base = createAIEditPlan(analysis, options);
  if (!base?.cuts?.length) return base;
  const prompt = options.creativePrompt || '';
  const flags = {
    action: /action|chase|race|speed|pursuit|aggressive|energetic/i.test(prompt),
    emotional: /emotional|romantic|beautiful|nostalgic|heartfelt/i.test(prompt),
    dark: /dark|night|moody|horror|noir/i.test(prompt),
    comedy: /funny|comedy|comic|meme/i.test(prompt)
  };
  const critique = critiqueAndImproveTimeline(base.cuts, { flags });
  return {
    ...base,
    cuts: critique.cuts,
    duration: critique.cuts.reduce((sum, cut) => sum + Number(cut.duration || 0), 0),
    qualityScore: critique.after.score,
    qualityReport: describeCritique(critique),
    directorPass: 'autonomous-quality-critic-v1'
  };
}

export function describeDirectedEditPlan(plan) {
  if (!plan) return 'No AI edit plan available.';
  return `${describeAIEditPlan(plan)} • ${plan.qualityReport || ''}`;
}
