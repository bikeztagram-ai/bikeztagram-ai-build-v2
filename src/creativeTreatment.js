/* BIKEZTAGRAM AI — reusable creative treatment independent of subject. */

export const TREATMENT_DIMENSIONS = Object.freeze(['tone','pacing','camera','lighting','colour','sound','transitions','text']);

export function buildCreativeTreatment({ tone = 'cinematic', pacing = 'dynamic', camera = 'immersive', lighting = 'natural', colour = 'cinematic-natural', sound = 'music-led', transitions = 'clean', text = 'minimal' } = {}) {
  return { version: 1, tone, pacing, camera, lighting, colour, sound, transitions, text };
}

export function mergeCreativeTreatment(base = {}, overrides = {}) {
  const treatment = buildCreativeTreatment(base);
  return TREATMENT_DIMENSIONS.reduce((result, key) => ({ ...result, [key]: overrides[key] ?? treatment[key] }), { version: 1 });
}
