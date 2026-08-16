import { createAIEditPlan } from './aiEditPlanner.js';
import { critiqueAndImproveTimeline, describeCritique } from './editCritic.js';

export function createDirectedEditPlan(analysis, options = {}) {
  const base = createAIEditPlan(analysis, options);
  if (!base?.cuts?.length) return base;
  const p = String(options.creativePrompt || '');
  const flags = {
    action: /action|chase|race|speed|pursuit|aggressive|energetic/i.test(p),
    emotional: /emotional|romantic|beautiful|nostalgic|heartfelt/i.test(p),
    dark: /dark|night|moody|horror|noir/i.test(p),
    comedy: /funny|comedy|comic|meme/i.test(p)
  };
  const critique = critiqueAndImproveTimeline(base.cuts, { flags });
  return { ...base, cuts: critique.cuts, duration: critique.cuts.reduce((s,c)=>s+Number(c.duration||0),0), qualityScore: critique.after.score, qualityReport: describeCritique(critique) };
}
