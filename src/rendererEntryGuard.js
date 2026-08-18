/* BIKEZTAGRAM AI — protected renderer entry guard.
   Validates and enriches the render request without changing renderer behaviour. */
import { validateRenderReadiness } from './renderQualityGuard.js';
import { buildRenderExecutionPlan } from './renderExecutionPlan.js';
import { prepareRenderExecution } from './renderExecutionGate.js';

export function prepareRendererRequest({ plan, mediaItems = [] } = {}) {
  if (!plan?.cuts?.length) throw new Error('Cannot render: no cuts are available.');

  const normalizedCuts = plan.cuts.map((cut) => ({
    ...cut,
    mediaIndex: Number.isInteger(Number(cut.mediaIndex)) ? Number(cut.mediaIndex) : 0,
  }));
  const normalizedPlan = { ...plan, cuts: normalizedCuts };
  const readiness = validateRenderReadiness({ mediaItems, plan: normalizedPlan });
  if (!readiness.ready) throw new Error(`Render readiness failed: ${readiness.issues.join(' ')}`);

  const executionPlan = buildRenderExecutionPlan({
    cuts: normalizedPlan.cuts,
    mediaItems,
    targetDuration: normalizedPlan.targetDuration || 15,
  });
  const execution = prepareRenderExecution(executionPlan, readiness);
  if (!execution.ready) throw new Error(execution.reason || 'Render execution gate blocked the render.');

  return { plan: normalizedPlan, execution, readiness };
}
