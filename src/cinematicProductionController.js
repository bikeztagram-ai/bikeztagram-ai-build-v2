/* BIKEZTAGRAM AI — cinematic production controller. £0-only. */
import { generateCinematicTrailer } from './cinematicGenerationClient.js';
import { createGenerationState, markGenerationStarted, markShotComplete, markGenerationFailed } from './cinematicGenerationState.js';

export function validateProductionShots(shots = []) {
  if (!Array.isArray(shots) || shots.length === 0) throw new Error('No cinematic shots are available for generation.');
  return shots.map((shot, index) => {
    const prompt = String(shot?.generationPrompt || shot?.prompt || '').trim();
    if (!prompt) throw new Error(`Shot ${index + 1} is missing a generation prompt.`);
    return { ...shot, id: shot.id || `shot-${index + 1}`, generationPrompt: prompt };
  });
}

export async function runCinematicProduction({ shots, referenceAssets = [], continuity = null, onState } = {}) {
  const safeShots = validateProductionShots(shots);
  let state = createGenerationState(safeShots);
  onState?.(state);

  try {
    const results = await generateCinematicTrailer({
      shots: safeShots,
      referenceAssets,
      continuity,
      onShotProgress: (event) => {
        state = markGenerationStarted(state, event.shotId);
        state = { ...state, progress: Math.max(state.progress, Math.round(((event.index + (event.percent || 0) / 100) / event.total) * 100)) };
        onState?.(state);
      },
      onProgress: (progress) => onState?.({ ...state, progress }),
    });

    state = results.reduce((next, result) => markShotComplete(next, result), state);
    state = { ...state, status: 'complete', currentShot: null, progress: 100 };
    onState?.(state);
    return state;
  } catch (error) {
    state = markGenerationFailed(state, error);
    onState?.(state);
    throw error;
  }
}
