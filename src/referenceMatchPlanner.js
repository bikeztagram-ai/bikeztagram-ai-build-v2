/* BIKEZTAGRAM AI — converts reference characteristics into an abstract treatment. */

export function analyseReferenceStyle(reference = {}) {
  return {
    pacing: reference.pacing || 'balanced',
    intensity: Math.min(1, Math.max(0, Number(reference.intensity) || 0.5)),
    palette: reference.palette || 'natural',
    camera: reference.camera || 'cinematic',
    transitions: reference.transitions || 'clean',
    typography: reference.typography || 'minimal',
    sound: reference.sound || 'immersive',
  };
}

export function buildReferenceTreatment(reference, overrides = {}) {
  return { version: 1, source: 'reference', treatment: { ...analyseReferenceStyle(reference), ...overrides } };
}
