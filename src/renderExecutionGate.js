/* BIKEZTAGRAM AI — final render execution gate.
   Keeps execution decisions separate from the protected renderer. */

export function prepareRenderExecution(executionPlan, readiness) {
  if (!executionPlan?.ready) return { ready: false, reason: 'Execution plan is not ready.' };
  if (!readiness?.ready) return { ready: false, reason: 'Render readiness check failed.', issues: readiness?.issues || [] };

  const cuts = Array.isArray(executionPlan.cuts) ? executionPlan.cuts : [];
  if (!cuts.length) return { ready: false, reason: 'Execution plan contains no cuts.' };

  return {
    ready: true,
    targetDuration: executionPlan.targetDuration,
    cuts: cuts.map((cut) => ({
      ...cut.execution,
      renderIndex: cut.renderIndex,
      sourceType: cut.sourceResolution?.type || 'video',
      generated: Boolean(cut.sourceResolution?.generated),
      storyRole: cut.storyRole || null,
      storyOrder: cut.storyOrder || null,
      treatment: cut.treatment || cut.directorTreatment || null,
    })),
  };
}
