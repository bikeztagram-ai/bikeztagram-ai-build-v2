/* BIKEZTAGRAM AI — recording plan boundary.
   Converts routed render media into a recording-safe sequence without changing
   the existing MediaRecorder/FFmpeg implementation.

   The deterministic frame schedule is an original Bikeztagram timing layer. It
   gives future preview, motion, beat-sync and renderer backends one shared clock.
*/
import { buildRenderFrameSchedule } from './renderFrameSchedule.js';

export function buildRenderRecordingPlan(routedExecution = {}, fps = 30) {
  if (!routedExecution?.ready) {
    return { ready: false, reason: 'Render execution is not ready.' };
  }

  const cuts = Array.isArray(routedExecution.cuts) ? routedExecution.cuts : [];
  if (!cuts.length) return { ready: false, reason: 'No render cuts available.' };

  const recordingCuts = cuts.map((cut, index) => ({
    ...cut,
    order: index,
    source: cut.mediaSource.url,
    kind: cut.mediaSource.kind,
    startTime: Number(cut.startTime) || 0,
    duration: Number(cut.duration) || 0,
    renderIndex: cut.renderIndex,
    purpose: cut.purpose || cut.storyRole || 'cinematic-beat',
    storyRole: cut.storyRole || null,
    directorIntent: cut.directorIntent || null,
    beatTreatment: cut.beatTreatment || null,
    transition: cut.transition || 'hard-cut',
    motionStyle: cut.motionStyle || 'static',
    motionIntensity: Number(cut.motionIntensity) || 0.65,
    speed: Number(cut.speed) || 1,
    speedEnd: Number(cut.speedEnd ?? cut.speed) || Number(cut.speed) || 1,
    colorGrade: cut.colorGrade || null,
    text: cut.text || '',
    treatment: cut.treatment || null,
  }));

  const frameSchedule = buildRenderFrameSchedule({ cuts: recordingCuts }, fps);

  return {
    ready: true,
    mode: routedExecution.mode || 'stable-video',
    targetDuration: routedExecution.targetDuration,
    fps: frameSchedule.fps,
    totalFrames: frameSchedule.totalFrames,
    durationSeconds: frameSchedule.durationSeconds,
    cuts: frameSchedule.cuts,
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
