/* Creative quality scoring is intentionally separate from technical render QA. */

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, number(value, min)));

export function scoreCreativeOutput({ shotVariety = 0, pacing = 0, musicImpact = 0, beatUtilisation = 0, continuity = 0, captionQuality = 0, storyCoherence = 0 } = {}) {
  const dimensions = { shotVariety, pacing, musicImpact, beatUtilisation, continuity, captionQuality, storyCoherence };
  const scores = Object.fromEntries(Object.entries(dimensions).map(([key, value]) => [key, clamp(value)]));
  const weighted = scores.shotVariety * .12 + scores.pacing * .16 + scores.musicImpact * .18 + scores.beatUtilisation * .14 + scores.continuity * .14 + scores.captionQuality * .08 + scores.storyCoherence * .18;
  return { version: 'creative-quality-v1', score: Math.round(weighted), dimensions: scores, verdict: weighted >= 80 ? 'STRONG' : weighted >= 65 ? 'PROMISING' : 'REVISE' };
}

export function buildCreativeRevisionPlan(score) {
  const dimensions = score?.dimensions || {};
  const reasons = Object.entries(dimensions).filter(([, value]) => Number(value) < 60).map(([key]) => key);
  return { version: 'creative-revision-v1', revise: reasons.length > 0, reasons, priority: reasons.slice().sort((a, b) => Number(dimensions[a]) - Number(dimensions[b])) };
}
