/* BIKEZTAGRAM AI — recording plan boundary.
   Converts routed render media into a recording-safe sequence without changing
   the existing MediaRecorder/FFmpeg implementation. */

export function buildRenderRecordingPlan(routedExecution = {}) {
  if (!routedExecution?.ready) {
    return { ready: false, reason: 'Render execution is not ready.' };
  }

  const cuts = Array.isArray(routedExecution.cuts) ? routedExecution.cuts : [];
  if (!cuts.length) return { ready: false, reason: 'No render cuts available.' };

  return {
    ready: true,
    mode: routedExecution.mode || 'stable-video',
    targetDuration: routedExecution.targetDuration,
    cuts: cuts.map((cut, index) => ({
      order: index,
      source: cut.mediaSource.url,
      kind: cut.mediaSource.kind,
      startTime: Number(cut.startTime) || 0,
      duration: Number(cut.duration) || 0,
      renderIndex: cut.renderIndex,
      treatment: cut.treatment || null,
      storyRole: cut.storyRole || null,
    })),
  };
}

export function canRecordRenderPlan(plan) {
  return Boolean(
    plan?.ready &&
    Array.isArray(plan.cuts) &&
    plan.cuts.length > 0 &&
    plan.cuts.every((cut) => cut.source && cut.duration > 0)
  );
}
