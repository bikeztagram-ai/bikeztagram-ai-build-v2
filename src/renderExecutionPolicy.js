import { assessRenderDuration } from './renderDurationPolicy.js';

export function assessRenderExecution(plan, expectedDuration = 15) {
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  const target = Number(expectedDuration);
  const targetDuration = Number.isFinite(target) && target > 0 ? target : 15;
  const plannedDuration = cuts.reduce((sum, cut) => sum + Math.max(0, Number(cut?.duration) || 0), 0);
  const missingCuts = cuts.length === 0;
  const durationPlan = assessRenderDuration(plannedDuration, targetDuration);
  const invalidCuts = cuts.filter((cut) => {
    const start = Number(cut?.startTime);
    const duration = Number(cut?.duration);
    return !Number.isFinite(start) || start < 0 || !Number.isFinite(duration) || duration <= 0;
  });

  const errors = [];
  if (missingCuts) errors.push('Render plan contains no cuts.');
  if (invalidCuts.length) errors.push(`${invalidCuts.length} render cut(s) have invalid timing.`);
  if (!durationPlan.valid) errors.push(`Render plan is materially short: ${durationPlan.actualDuration}s planned for ${durationPlan.expectedDuration}s.`);

  return {
    ready: errors.length === 0,
    targetDuration: durationPlan.expectedDuration,
    plannedDuration: durationPlan.actualDuration,
    cutCount: cuts.length,
    errors,
    durationCheck: durationPlan,
  };
}
