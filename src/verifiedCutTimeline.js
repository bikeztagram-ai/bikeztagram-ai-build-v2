import { createTimeline } from './timelineModel.js';

/** Convert verified two-stage cuts into the existing non-destructive timeline shape. */
export function createTimelineFromVerifiedCuts(cuts = {}) {
  const sourceCuts = Array.isArray(cuts) ? cuts : [];
  let cursor = 0;
  const video = sourceCuts.map((cut, index) => {
    const duration = Math.max(0.5, Number(cut.duration) || 0.5);
    const clip = {
      id: cut.id || `verified-shot-${index + 1}`,
      sourceMomentIndex: Number(cut.momentIndex),
      start: cursor,
      duration,
      trimIn: Number(cut.startTime),
      trimOut: Number(cut.endTime),
      speed: Number(cut.speed) || 1,
      transition: cut.transition || 'hard-cut',
      motionStyle: cut.motionStyle || 'static',
      purpose: cut.purpose || 'cinematic',
      text: cut.text || '',
    };
    cursor += duration;
    return clip;
  });
  return createTimeline({ duration: cursor, tracks: { video } });
}
