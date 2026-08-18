/* BIKEZTAGRAM AI — stable-renderer compatibility adapter.
   Converts the recording-safe timeline contract into the exact plan shape the
   existing stable renderer already understands. It does not replace or modify
   renderer.js, and it deliberately fails closed when a source cannot be mapped.
*/

import { canRecordRenderPlan } from './renderRecordingPlan.js';

function sourceKey(source) {
  return String(source || '').trim();
}

function mediaSourceUrl(item) {
  return item?.sourceUrl || item?.source?.url || '';
}

function findMediaIndex(mediaItems, source, renderIndex) {
  const key = sourceKey(source);
  const byUrl = mediaItems.findIndex((item) => sourceKey(mediaSourceUrl(item)) === key);
  if (byUrl >= 0) return byUrl;

  const fallback = Number(renderIndex);
  if (Number.isInteger(fallback) && fallback >= 0 && fallback < mediaItems.length) return fallback;
  return -1;
}

export function buildStableRendererInput(recordingPlan = {}, mediaItems = []) {
  if (!canRecordRenderPlan(recordingPlan)) {
    return { ready: false, reason: 'Recording plan is not ready for the stable renderer.' };
  }

  const sourceItems = Array.isArray(mediaItems) ? mediaItems : [];
  const cuts = [];

  for (const [index, cut] of recordingPlan.cuts.entries()) {
    const mediaIndex = findMediaIndex(sourceItems, cut.source, cut.renderIndex);
    if (mediaIndex < 0) {
      return {
        ready: false,
        reason: `Recording cut ${index + 1} cannot be mapped to an existing media item.`,
        cutIndex: index,
      };
    }

    cuts.push({
      mediaIndex,
      mediaId: sourceItems[mediaIndex]?.id,
      startTime: Number(cut.startTime) || 0,
      duration: Number(cut.duration) || 0,
      purpose: cut.storyRole || 'cinematic-beat',
      storyRole: cut.storyRole || null,
      transition: 'hard-cut',
      motionStyle: 'static',
      motionIntensity: 0.65,
      speed: 1,
      speedEnd: 1,
    });
  }

  return {
    ready: true,
    mediaItems: sourceItems,
    plan: {
      cuts,
      targetDuration: recordingPlan.durationSeconds,
      colorGrade: 'cinematic',
    },
  };
}
