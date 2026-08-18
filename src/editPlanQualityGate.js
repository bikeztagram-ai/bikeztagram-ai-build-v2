import { normalizeEditCut } from './editPlanTiming.js';

const MAX_CUTS = 8;
const MIN_DURATION = 0.5;
const MAX_DURATION = 4;
const TRANSITIONS = new Set(['hard-cut','fade-in','fade-out','dip-black','crossfade','flash-cut','whip-left','whip-right']);
const MOTION = new Set(['static','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down']);

export function validateEditPlan(plan = {}, moments = []) {
  const errors = [];
  const warnings = [];
  const cuts = Array.isArray(plan.cuts) ? plan.cuts : [];
  const verifiedMoments = Array.isArray(moments) ? moments : [];

  if (!cuts.length) errors.push('Edit plan contains no cuts.');
  if (cuts.length > MAX_CUTS) errors.push(`Edit plan exceeds ${MAX_CUTS} cuts.`);

  const normalized = [];
  const usedMoments = new Set();
  let totalDuration = 0;
  for (let index = 0; index < cuts.length; index += 1) {
    const cut = cuts[index];
    const momentIndex = Number(cut?.momentIndex);
    const moment = Number.isInteger(momentIndex) ? verifiedMoments[momentIndex] : null;
    const safe = normalizeEditCut(cut, moment, verifiedMoments.length);
    if (!safe) {
      errors.push(`Cut ${index + 1} is not safely linked to a verified moment.`);
      continue;
    }
    if (safe.duration < MIN_DURATION || safe.duration > MAX_DURATION) errors.push(`Cut ${index + 1} has an invalid duration.`);
    if (!TRANSITIONS.has(safe.transition)) warnings.push(`Cut ${index + 1} used a fallback transition.`);
    if (!MOTION.has(safe.motionStyle)) warnings.push(`Cut ${index + 1} used a fallback motion style.`);
    if (usedMoments.has(safe.momentIndex)) warnings.push(`Verified moment ${safe.momentIndex} is reused.`);
    usedMoments.add(safe.momentIndex);
    totalDuration += safe.duration;
    normalized.push(safe);
  }

  if (normalized.length && totalDuration < 1.5) warnings.push('Edit is very short; preserve this only when the source supports no longer cut sequence.');
  if (normalized.length && normalized.length >= 3 && usedMoments.size < 2) warnings.push('Edit lacks source-moment variety.');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedCuts: normalized,
    metrics: { cutCount: normalized.length, uniqueMoments: usedMoments.size, duration: Number(totalDuration.toFixed(3)) },
  };
}

export function normalizeVerifiedEditPlan(plan = {}, moments = []) {
  const validation = validateEditPlan(plan, moments);
  if (!validation.normalizedCuts.length) return { ...plan, cuts: [] };
  return { ...plan, cuts: validation.normalizedCuts };
}
