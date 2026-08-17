/* BIKEZTAGRAM AI — non-destructive browser edit-plan engine. */

export const EDIT_OPERATIONS = Object.freeze(['trim','split','speed','transition','caption','music','look','reframe']);

export function createEditProject({ width = 1920, height = 1080, fps = 30 } = {}) {
  return { version: 1, width, height, fps, tracks: [], markers: [], selectedClipId: null, history: [] };
}

export function addTrack(project, type = 'video') {
  const track = { id: `track-${project.tracks.length + 1}`, type, clips: [] };
  return { ...project, tracks: [...project.tracks, track] };
}

export function addClip(project, trackId, clip) {
  const tracks = project.tracks.map((track) => track.id !== trackId ? track : { ...track, clips: [...track.clips, normaliseClip(clip)] });
  return { ...project, tracks };
}

export function normaliseClip(clip = {}) {
  const sourceDuration = Math.max(0.1, Number(clip.sourceDuration) || Number(clip.duration) || 1);
  const start = Math.max(0, Number(clip.start) || 0);
  const end = Math.min(sourceDuration, Math.max(start, Number(clip.end) || sourceDuration));
  return { id: clip.id || `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, assetId: clip.assetId || null, sourceDuration, start, end, speed: Math.max(0.1, Math.min(8, Number(clip.speed) || 1)), transition: clip.transition || null, captionIds: Array.isArray(clip.captionIds) ? clip.captionIds : [], lookId: clip.lookId || null, reframe: clip.reframe || null };
}

export function applyEdit(project, operation, payload = {}) {
  if (!EDIT_OPERATIONS.includes(operation)) throw new Error(`Unsupported edit operation: ${operation}`);
  const historyEntry = { operation, payload, at: new Date().toISOString() };
  return { ...project, history: [...project.history, historyEntry] };
}

export function getTimelineDuration(project) {
  return Math.max(0, ...project.tracks.flatMap((track) => track.clips.map((clip) => (clip.end - clip.start) / clip.speed)));
}

export function validateEditProject(project) {
  const errors = [];
  if (!project?.tracks?.length) errors.push('No editing tracks exist.');
  project?.tracks?.forEach((track) => track.clips.forEach((clip) => {
    if (!clip.assetId) errors.push(`Clip ${clip.id} has no source asset.`);
    if (clip.end <= clip.start) errors.push(`Clip ${clip.id} has an invalid range.`);
  }));
  return { valid: errors.length === 0, errors };
}
