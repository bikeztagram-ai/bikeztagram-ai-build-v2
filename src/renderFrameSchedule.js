/* BIKEZTAGRAM AI — deterministic render frame schedule.
   Inspired by the useful open-source pattern of making the timeline a deterministic
   frame-space contract. This is an original Bikeztagram implementation; it does
   not copy third-party source. It converts recording-safe cuts into exact frame
   ranges so preview, motion, beat timing and future render backends can share the
   same timing model.

   Protected renderer behaviour is unchanged.
*/

export function buildRenderFrameSchedule(plan = {}, fps = 30) {
  const safeFps = Number.isFinite(Number(fps)) && Number(fps) > 0 ? Number(fps) : 30;
  const cuts = Array.isArray(plan.cuts) ? plan.cuts : [];
  let cursor = 0;

  const scheduledCuts = cuts.map((cut, index) => {
    const durationSeconds = Math.max(0, Number(cut.duration) || 0);
    const frameCount = Math.max(0, Math.round(durationSeconds * safeFps));
    const startFrame = cursor;
    const endFrame = startFrame + frameCount;
    cursor = endFrame;

    return {
      ...cut,
      order: Number.isInteger(cut.order) ? cut.order : index,
      startFrame,
      endFrame,
      frameCount,
      fps: safeFps,
      durationSeconds: frameCount / safeFps,
    };
  });

  return {
    fps: safeFps,
    totalFrames: cursor,
    durationSeconds: cursor / safeFps,
    cuts: scheduledCuts,
  };
}

export function frameAtTime(seconds, fps = 30) {
  const safeFps = Number.isFinite(Number(fps)) && Number(fps) > 0 ? Number(fps) : 30;
  const time = Math.max(0, Number(seconds) || 0);
  return Math.max(0, Math.floor(time * safeFps));
}

export function findScheduledCut(schedule, frame) {
  const target = Math.max(0, Math.floor(Number(frame) || 0));
  return (schedule?.cuts || []).find((cut) => target >= cut.startFrame && target < cut.endFrame) || null;
}
