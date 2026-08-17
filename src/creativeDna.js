/* BIKEZTAGRAM AI — user creative DNA, domain-neutral and opt-in. */

export function createCreativeDna(seed = {}) {
  return {
    version: 1,
    pacing: seed.pacing || 'balanced',
    visualIntensity: Number(seed.visualIntensity) || 0.5,
    colourPreference: seed.colourPreference || 'natural',
    transitionPreference: seed.transitionPreference || 'clean',
    captionPreference: seed.captionPreference || 'minimal',
    musicIntensity: Number(seed.musicIntensity) || 0.5,
    cameraPreference: seed.cameraPreference || 'cinematic',
    notes: Array.isArray(seed.notes) ? [...seed.notes].slice(0, 50) : [],
  };
}

export function learnCreativeDna(dna, feedback = {}) {
  const next = createCreativeDna(dna);
  const fields = ['pacing','colourPreference','transitionPreference','captionPreference','cameraPreference'];
  fields.forEach((field) => { if (feedback[field]) next[field] = String(feedback[field]); });
  ['visualIntensity','musicIntensity'].forEach((field) => { if (feedback[field] != null) next[field] = Math.min(1, Math.max(0, Number(feedback[field]))); });
  if (feedback.note) next.notes = [...next.notes, String(feedback.note)].slice(-50);
  return next;
}
