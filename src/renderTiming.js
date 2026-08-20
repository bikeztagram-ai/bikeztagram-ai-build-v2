/* BIKEZTAGRAM AI — render timing policy
   Keeps browser playback/rendering deterministic without changing the protected media pipeline. */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function normaliseCutTiming(cut = {}, sourceDuration = Infinity) {
  const available = Number.isFinite(Number(sourceDuration)) ? Math.max(0, Number(sourceDuration)) : Infinity;
  const start = clamp(Number(cut.startTime) || 0, 0, Number.isFinite(available) ? Math.max(0, available - 0.05) : Infinity);
  const requested = clamp(Number(cut.duration) || 2, 0.5, 8);
  const maxDuration = Number.isFinite(available) ? Math.max(0.5, available - start) : requested;
  const duration = clamp(requested, 0.5, maxDuration);
  const speedStart = clamp(Number(cut.speed) || 1, 0.5, 1.75);
  const speedEnd = clamp(Number(cut.speedEnd ?? cut.speed) || speedStart, 0.5, 1.75);
  return { startTime: start, duration, speedStart, speedEnd };
}
export function buildRenderClock(cuts = []) { let elapsed = 0; return cuts.map((cut, index) => { const duration = Math.max(0.5, Number(cut?.duration) || 2); const entry = { index, start: elapsed, end: elapsed + duration, duration }; elapsed += duration; return entry; }); }
export function renderCompletionThreshold(cuts = []) { const total = cuts.reduce((sum, cut) => sum + Math.max(0.5, Number(cut?.duration) || 2), 0); return { expectedSeconds: total, minimumProgress: total > 0 ? 0.995 : 1 }; }
