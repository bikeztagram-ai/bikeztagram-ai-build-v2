import { assessRenderDuration } from './renderDurationPolicy.js';

function finitePositive(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function averageSpeed(cut) {
  const start = finitePositive(cut?.speed, 1);
  const end = finitePositive(cut?.speedEnd, start);
  return Math.max(0.5, Math.min(1.5, (start + end) / 2));
}

function outputDuration(cut) {
  return finitePositive(cut?.duration, 0);
}

function sourceConsumption(cut) {
  return outputDuration(cut) * averageSpeed(cut);
}

export function assessRenderExecution(plan, expectedDuration = 15, options = {}) {
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  const target = finitePositive(expectedDuration, 15);
  const sourceDuration = finitePositive(options?.sourceDuration, 0);
  const plannedDuration = cuts.reduce((sum, cut) => sum + outputDuration(cut), 0);
  const missingCuts = cuts.length === 0;

  const invalidCuts = cuts.filter((cut) => {
    const start = Number(cut?.startTime);
    const duration = Number(cut?.duration);
    const end = Number.isFinite(Number(cut?.endTime)) ? Number(cut.endTime) : start + duration;
    return !Number.isFinite(start) || start < 0 || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(end) || end <= start;
  });

  const outOfBoundsCuts = sourceDuration > 0
    ? cuts.filter((cut) => {
        const start = Number(cut?.startTime);
        const duration = Number(cut?.duration);
        const end = Number.isFinite(Number(cut?.endTime)) ? Number(cut.endTime) : start + duration;
        const consumedEnd = Number.isFinite(start) && Number.isFinite(duration)
          ? start + sourceConsumption(cut)
          : Infinity;
        return Number.isFinite(start) && Number.isFinite(end)
          && (start >= sourceDuration || end > sourceDuration + 0.05 || consumedEnd > sourceDuration + 0.05);
      })
    : [];

  const durationPlan = assessRenderDuration(plannedDuration, target);
  const errors = [];
  if (missingCuts) errors.push('Render plan contains no cuts.');
  if (invalidCuts.length) errors.push(`${invalidCuts.length} render cut(s) have invalid timing.`);
  if (outOfBoundsCuts.length) errors.push(`${outOfBoundsCuts.length} render cut(s) exceed the verified source duration after speed is applied.`);
  if (!durationPlan.valid) errors.push(`Render plan is materially short: ${durationPlan.actualDuration}s output planned for ${durationPlan.expectedDuration}s.`);

  return {
    ready: errors.length === 0,
    targetDuration: durationPlan.expectedDuration,
    plannedDuration: durationPlan.actualDuration,
    cutCount: cuts.length,
    sourceDuration: sourceDuration || null,
    durationSemantics: 'cut.duration is rendered output seconds; speed controls source consumption',
    sourceConsumptionAccountsForSpeed: true,
    errors,
    durationCheck: durationPlan,
    invalidCutCount: invalidCuts.length,
    outOfBoundsCutCount: outOfBoundsCuts.length,
  };
}
