/* BIKEZTAGRAM AI — deterministic AutoCut planning layer. */

export function buildBeatCutPlan(clips = [], beats = [], { targetDuration = null, intensity = 'dynamic' } = {}) {
  const safeClips = Array.isArray(clips) ? clips : [];
  const safeBeats = Array.isArray(beats) ? beats.filter((beat) => Number.isFinite(Number(beat))).map(Number).sort((a, b) => a - b) : [];
  if (!safeClips.length) return [];
  const cuts = [];
  let cursor = 0;
  safeClips.forEach((clip, index) => {
    const duration = Math.max(0.5, Number(clip.duration) || 1);
    const candidates = safeBeats.filter((beat) => beat > cursor + 0.35 && beat <= cursor + duration + 0.75);
    const end = candidates.length ? candidates[candidates.length - 1] : cursor + duration;
    cuts.push({ id: clip.id || `clip-${index + 1}`, sourceId: clip.sourceId || clip.id, start: cursor, end, speed: intensity === 'high' && index % 2 ? 1.15 : 1 });
    cursor = end;
  });
  if (targetDuration && cuts.length) cuts[cuts.length - 1].end = Math.max(cuts[cuts.length - 1].start + 0.5, Number(targetDuration));
  return cuts;
}

export function detectSimpleBeats(audioData = []) {
  const values = Array.from(audioData, (value) => Math.abs(Number(value) || 0));
  if (values.length < 4) return [];
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const threshold = average * 1.6;
  const beats = [];
  for (let i = 1; i < values.length - 1; i += 1) {
    if (values[i] > threshold && values[i] >= values[i - 1] && values[i] >= values[i + 1]) beats.push(i);
  }
  return beats;
}
