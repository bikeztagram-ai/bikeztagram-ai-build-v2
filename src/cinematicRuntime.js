/* BIKEZTAGRAM AI — deterministic cinematic render cues */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const MOTIONS = new Set(['static', 'cinematic', 'slow-push', 'slow-pull', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'orbit', 'parallax']);
const TRANSITIONS = new Set(['hard-cut', 'fade-in', 'fade-out', 'crossfade', 'flash-cut', 'dip-black', 'whip-left', 'whip-right', 'zoom-punch', 'light-leak', 'light-leak-left', 'light-leak-right']);

function normalizeMotion(value) {
  const motion = String(value || 'cinematic').trim().toLowerCase();
  if (motion === 'zoom') return 'slow-push';
  if (motion === 'zoom-out') return 'slow-pull';
  return MOTIONS.has(motion) ? motion : 'cinematic';
}

function normalizeTransition(value, index, total) {
  const transition = String(value || '').trim().toLowerCase();
  if (TRANSITIONS.has(transition)) return transition;
  if (index === 0) return 'fade-in';
  if (index === total - 1) return 'fade-out';
  return 'hard-cut';
}

/**
 * Turn editorial speed decisions into deterministic source-time sampling.
 * `speed` and `speedEnd` describe playback rate at the start/end of a clip.
 * The integral is used so a speed ramp never silently changes the requested
 * output duration: the renderer receives source time, not a guessed frame.
 */
export function sampleSpeedRamp({ progress = 0, speed = 1, speedEnd = speed } = {}) {
  const p = clamp(finite(progress, 0), 0, 1);
  const start = clamp(finite(speed, 1), 0.25, 2.5);
  const end = clamp(finite(speedEnd, start), 0.25, 2.5);
  const rate = start + (end - start) * p;
  return { progress: p, rate, normalized: rate / Math.max(0.01, start) };
}

export function sourceTimeAtProgress({ sourceStart = 0, sourceDuration = 1, progress = 0, speed = 1, speedEnd = speed } = {}) {
  const start = Math.max(0, finite(sourceStart, 0));
  const duration = Math.max(0, finite(sourceDuration, 0));
  const p = clamp(finite(progress, 0), 0, 1);
  const s = clamp(finite(speed, 1), 0.25, 2.5);
  const e = clamp(finite(speedEnd, s), 0.25, 2.5);
  const average = (s + e) / 2;
  if (average <= 0) return start;
  // Integrate the linear speed ramp and normalise by its total area.
  const integral = s * p + ((e - s) * p * p) / 2;
  const totalIntegral = (s + e) / 2;
  return start + duration * clamp(integral / totalIntegral, 0, 1);
}

/** Snap a clip boundary to a nearby soundtrack beat without changing its role. */
export function snapToBeat(time, beats, tolerance = 0.12) {
  const target = finite(time, 0);
  if (!Array.isArray(beats) || !beats.length) return { time: target, snapped: false, beatIndex: null };
  let best = null;
  beats.forEach((beat, index) => {
    const value = finite(typeof beat === 'object' ? beat.time : beat, NaN);
    if (!Number.isFinite(value)) return;
    const distance = Math.abs(value - target);
    if (distance <= Math.max(0, tolerance) && (!best || distance < best.distance)) best = { value, index, distance };
  });
  return best ? { time: best.value, snapped: true, beatIndex: best.index, distance: best.distance } : { time: target, snapped: false, beatIndex: null };
}

/**
 * Produce a renderer-ready cue while retaining every editorial decision.
 * This is intentionally serialisable and provider-neutral.
 */
export function buildRenderCue(clip, index, total, beats = []) {
  const duration = Math.max(0.5, finite(clip?.duration, 2));
  const sourceStart = Math.max(0, finite(clip?.sourceProvenance?.sourceStart ?? clip?.startTime, 0));
  const sourceEnd = finite(clip?.sourceProvenance?.sourceEnd ?? clip?.endTime, sourceStart + duration);
  const sourceDuration = Math.max(0.01, sourceEnd - sourceStart);
  const speed = clamp(finite(clip?.speed, 1), 0.25, 2.5);
  const speedEnd = clamp(finite(clip?.speedEnd, speed), 0.25, 2.5);
  const startBeat = snapToBeat(clip?.beatAnchor?.beatTime ?? clip?.start, beats);
  const endBeat = snapToBeat(clip?.end, beats);
  return {
    id: clip?.id || `clip-${index + 1}`,
    editorialOrder: index,
    editorialRole: clip?.editorialRole || 'cinematic',
    sourceType: clip?.sourceType || 'uploaded',
    mediaId: clip?.sourceProvenance?.mediaId ?? clip?.mediaId ?? null,
    sourceStart,
    sourceDuration,
    outputStart: Math.max(0, finite(clip?.start, 0)),
    outputDuration: duration,
    motion: normalizeMotion(clip?.motion || clip?.motionStyle),
    motionIntensity: clamp(finite(clip?.motionIntensity, 0.85), 0.25, 1.6),
    speed,
    speedEnd,
    transition: normalizeTransition(clip?.transition || clip?.transitionIn, index, total),
    transitionDuration: clamp(finite(clip?.transitionDuration, 0.2), 0, Math.min(1, duration * 0.45)),
    colorGrade: clip?.colorGrade || 'dark-cinematic',
    text: String(clip?.text || '').trim(),
    beatAnchor: clip?.beatAnchor || null,
    beatSync: {
      start: startBeat,
      end: endBeat,
      locked: Boolean(startBeat.snapped || endBeat.snapped)
    },
    generated: clip?.sourceType === 'generated',
    generationPrompt: clip?.sourceType === 'generated' ? String(clip?.prompt || '').trim() : ''
  };
}

export function buildRenderCueTrack(timeline, beats = []) {
  const clips = timeline?.tracks?.find((track) => track?.type === 'video')?.clips || [];
  return clips.map((clip, index) => buildRenderCue(clip, index, clips.length, beats));
}

export function validateRenderCueTrack(cues) {
  const errors = [];
  if (!Array.isArray(cues) || !cues.length) errors.push('render cue track is empty');
  let previousEnd = -Infinity;
  (cues || []).forEach((cue, index) => {
    if (cue.editorialOrder !== index) errors.push(`cue ${index + 1}: editorial order mismatch`);
    if (!(cue.outputDuration >= 0.5)) errors.push(`cue ${index + 1}: invalid output duration`);
    if (cue.outputStart < previousEnd - 0.001) errors.push(`cue ${index + 1}: output overlap`);
    if (!MOTIONS.has(cue.motion)) errors.push(`cue ${index + 1}: invalid motion`);
    if (!TRANSITIONS.has(cue.transition)) errors.push(`cue ${index + 1}: invalid transition`);
    if (!(cue.speed >= 0.25 && cue.speed <= 2.5)) errors.push(`cue ${index + 1}: invalid speed`);
    if (!(cue.speedEnd >= 0.25 && cue.speedEnd <= 2.5)) errors.push(`cue ${index + 1}: invalid end speed`);
    previousEnd = cue.outputStart + cue.outputDuration;
  });
  return { valid: errors.length === 0, errors, cueCount: Array.isArray(cues) ? cues.length : 0 };
}
