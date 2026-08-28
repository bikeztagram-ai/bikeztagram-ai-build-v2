const MIN_DURATION_SECONDS = 5;
const MAX_DURATION_SECONDS = 60;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Resolve an explicit creator-requested runtime, preserving the existing fallback. */
export function resolveCreativeDuration(prompt, fallback = 15) {
  const safeFallback = clamp(Number.isFinite(Number(fallback)) ? Number(fallback) : 15, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS);
  const text = String(prompt || '').toLowerCase().replace(/×/g, 'x');
  const seconds = text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:second|seconds|sec|secs|s)(?=\b)/);
  const minutes = text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:minute|minutes|min|mins)(?=\b)/);
  if (!seconds && !minutes) return Math.round(safeFallback * 100) / 100;

  let requested = 0;
  if (minutes) requested += Number(minutes[1]) * 60;
  if (seconds) requested += Number(seconds[1]);
  if (!Number.isFinite(requested) || requested <= 0) return Math.round(safeFallback * 100) / 100;
  return Math.round(clamp(requested, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS) * 100) / 100;
}

export const CREATIVE_DURATION_LIMITS = Object.freeze({
  minSeconds: MIN_DURATION_SECONDS,
  maxSeconds: MAX_DURATION_SECONDS,
});
