/* BIKEZTAGRAM AI — reusable creative treatment engine. */

export const TREATMENT_PRESETS = Object.freeze({
  cinematic: { camera: 'motivated', lighting: 'natural-contrast', colour: 'film', pacing: 'dynamic', sound: 'immersive', transitions: 'restrained' },
  social-punchy: { camera: 'close-action', lighting: 'bright', colour: 'clean', pacing: 'fast', sound: 'beat-driven', transitions: 'energetic' },
  luxury: { camera: 'controlled', lighting: 'sculpted', colour: 'refined', pacing: 'measured', sound: 'polished', transitions: 'minimal' },
  documentary: { camera: 'observational', lighting: 'authentic', colour: 'natural', pacing: 'organic', sound: 'diegetic', transitions: 'clean' },
  dramatic: { camera: 'expressive', lighting: 'contrast', colour: 'moody', pacing: 'building', sound: 'cinematic', transitions: 'motivated' },
});

export function buildCreativeTreatment({ style = 'cinematic', overrides = {}, subjectType = 'general' } = {}) {
  const base = TREATMENT_PRESETS[style] || TREATMENT_PRESETS.cinematic;
  return { version: 1, style: TREATMENT_PRESETS[style] ? style : 'cinematic', subjectType, ...base, ...overrides };
}

export function treatmentToDirectorConstraints(treatment) {
  return {
    cameraLanguage: treatment.camera,
    lightingLanguage: treatment.lighting,
    colourLanguage: treatment.colour,
    pacingLanguage: treatment.pacing,
    soundLanguage: treatment.sound,
    transitionLanguage: treatment.transitions,
  };
}
