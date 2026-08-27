const MIN_DURATION = 5;
const MAX_DURATION = 60;

function clamp(value) {
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, value));
}

/**
 * Resolve an explicit duration request without requiring a provider call.
 * Examples: "15 seconds", "30s", "make a 1 minute reel".
 * Returns fallback when the prompt does not contain a confident duration.
 */
export function resolvePromptDuration(prompt, fallback = 15) {
  const fallbackNumber = Number(fallback);
  const safeFallback = Number.isFinite(fallbackNumber) ? clamp(fallbackNumber) : 15;
  const text = String(prompt || '').trim().toLowerCase();
  if (!text) return safeFallback;

  const minuteMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|min)\b/);
  if (minuteMatch) {
    const minutes = Number(minuteMatch[1]);
    if (Number.isFinite(minutes) && minutes > 0) return clamp(minutes * 60);
  }

  const secondMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|sec|s)\b/);
  if (secondMatch) {
    const seconds = Number(secondMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) return clamp(seconds);
  }

  return safeFallback;
}

export const PROMPT_DURATION_LIMITS = Object.freeze({ min: MIN_DURATION, max: MAX_DURATION });
