/* BIKEZTAGRAM AI — turns human feedback into structured revision intent. */

const FEEDBACK_MAP = Object.freeze({ darker: { visualIntensity: 0.65 }, brighter: { visualIntensity: 0.35 }, faster: { pacing: 'fast' }, slower: { pacing: 'slow' }, cinematic: { cameraPreference: 'cinematic', transitionPreference: 'film' }, minimal: { transitionPreference: 'clean', captionPreference: 'minimal' }, aggressive: { visualIntensity: 0.8, musicIntensity: 0.8 }, subtle: { visualIntensity: 0.35, musicIntensity: 0.35 } });

export function interpretCreativeFeedback(text = '') {
  const input = String(text).toLowerCase();
  const matches = Object.keys(FEEDBACK_MAP).filter((key) => input.includes(key));
  return { text: String(text), matches, adjustments: matches.reduce((out, key) => ({ ...out, ...FEEDBACK_MAP[key] }), {}) };
}

export function buildRevisionRequest(text, current = {}) {
  const parsed = interpretCreativeFeedback(text);
  return { version: 1, source: 'user-feedback', instruction: parsed.text, adjustments: parsed.adjustments, current, requiresReview: Object.keys(parsed.adjustments).length === 0 };
}
