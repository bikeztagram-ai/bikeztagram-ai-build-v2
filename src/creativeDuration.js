const MIN_DURATION_SECONDS = 5;
const MAX_DURATION_SECONDS = 60;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Resolve an explicit creator-requested runtime, preserving the existing fallback. */
export function resolveCreativeDuration(prompt, fallback = 15) {
  const safeFallback = clamp(Number.isFinite(Number(fallback)) ? Number(fallback) : 15, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS);
  const text = String(prompt || '').toLowerCase().replace(/×/g, 'x');
  const matches = [
    ...text.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:-\s*)?(?:second|seconds|sec|secs|s)(?=\b)/g),
    ...text.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:-\s*)?(?:minute|minutes|min|mins)(?=\b)/g),
  ];
  if (!matches.length) return Math.round(safeFallback * 100) / 100;

  const secondsMatch = text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:-\s*)?(?:second|seconds|sec|secs|s)(?=\b)/);
  const minutesMatch = text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:-\s*)?(?:minute|minutes|min|mins)(?=\b)/);
  const requested = secondsMatch
    ? Number(secondsMatch[1])
    : Number(minutesMatch[1]) * 60;
  if (!Number.isFinite(requested)) return Math.round(safeFallback * 100) / 100;
  return Math.round(clamp(requested, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS) * 100) / 100;
}

export const CREATIVE_DURATION_LIMITS = Object.freeze({
  minSeconds: MIN_DURATION_SECONDS,
  maxSeconds: MAX_DURATION_SECONDS,
});
