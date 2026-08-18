/* Non-destructive, domain-agnostic timeline model. Keeps legacy edit plans compatible. */

const DEFAULT_TRACKS = ['video', 'audio', 'captions', 'overlays'];

function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function createTimeline(input = {}) {
  const sourceTracks = input.tracks && typeof input.tracks === 'object' ? input.tracks : {};
  const tracks = {};

  for (const type of DEFAULT_TRACKS) {
    const entries = Array.isArray(sourceTracks[type]) ? sourceTracks[type] : [];
    tracks[type] = entries.map((clip, index) => normalizeClip(clip, type, index));
  }

  for (const [type, entries] of Object.entries(sourceTracks)) {
    if (!tracks[type]) tracks[type] = Array.isArray(entries)
      ? entries.map((clip, index) => normalizeClip(clip, type, index))
      : [];
  }

  return {
    version: 1,
    duration: Math.max(numberOr(input.duration, 0), calculateDuration(tracks)),
    tracks,
  };
}

export function normalizeClip(clip = {}, trackType = 'video', index = 0) {
  const start = Math.max(0, numberOr(clip.start ?? clip.startTime, 0));
  const duration = Math.max(0, numberOr(clip.duration, 0));
  const trimIn = Math.max(0, numberOr(clip.trimIn, 0));
  const trimOut = Math.max(trimIn, numberOr(clip.trimOut, trimIn + duration));

  return {
    ...clip,
    id: clip.id || `${trackType}-${index + 1}`,
    trackType,
    start,
    duration,
    end: start + duration,
    trimIn,
    trimOut,
    locked: Boolean(clip.locked),
  };
}

export function calculateDuration(tracks = {}) {
  return Object.values(tracks)
    .flatMap((entries) => Array.isArray(entries) ? entries : [])
    .reduce((max, clip) => Math.max(max, numberOr(clip.end, numberOr(clip.start) + numberOr(clip.duration))), 0);
}

export function validateTimeline(timeline = {}) {
  const errors = [];
  const tracks = timeline.tracks;
  if (!tracks || typeof tracks !== 'object') errors.push('Timeline has no tracks.');

  for (const [type, clips] of Object.entries(tracks || {})) {
    if (!Array.isArray(clips)) {
      errors.push(`Track ${type} is not an array.`);
      continue;
    }
    for (const clip of clips) {
      if (clip.start < 0 || clip.duration < 0) errors.push(`Clip ${clip.id || 'unknown'} has invalid timing.`);
      if (clip.end < clip.start) errors.push(`Clip ${clip.id || 'unknown'} has an invalid end time.`);
      if (clip.trimOut < clip.trimIn) errors.push(`Clip ${clip.id || 'unknown'} has invalid trim bounds.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function toLegacyEditPlan(timeline = {}) {
  const tracks = Object.fromEntries(
    Object.entries(timeline.tracks || {}).map(([type, clips]) => [
      type,
      clips.map(({ end, trackType, ...clip }) => clip),
    ]),
  );
  return { tracks };
}
