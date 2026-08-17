/* BIKEZTAGRAM AI — production bridge. Converts an AI Director blueprint into real GPU generation requests. £0-only. */
import { generateCinematicTrailer } from './cinematicGenerationClient.js';

export function buildGenerationShots(productionPlan, { referenceAssets = [], continuity = null } = {}) {
  if (!productionPlan?.scenes?.length) throw new Error('AI Director production plan contains no scenes.');

  return productionPlan.scenes
    .filter((scene) => scene?.sourceType === 'generated' || scene?.generated === true)
    .map((scene, index) => ({
      id: scene.id || `generated-shot-${index + 1}`,
      prompt: scene.generationPrompt || scene.prompt || scene.purpose || 'Cinematic motorcycle shot',
      generationPrompt: scene.generationPrompt || scene.prompt || scene.purpose || 'Cinematic motorcycle shot',
      duration: Math.max(1, Math.min(5, Number(scene.duration) || 4)),
      aspectRatio: scene.aspectRatio || '16:9',
      referenceAssets: scene.referenceAssets || referenceAssets,
      continuity: scene.continuity || continuity,
      purpose: scene.purpose || 'generated-cinematic-shot',
    }));
}

export async function generateDirectorTrailer(productionPlan, options = {}) {
  const shots = buildGenerationShots(productionPlan, options);
  if (!shots.length) throw new Error('The Director plan contains no generated shots. Ask for generated cinematic scenes in the creative brief.');
  return generateCinematicTrailer({
    shots,
    referenceAssets: options.referenceAssets || [],
    continuity: options.continuity || null,
    onShotProgress: options.onShotProgress,
    onProgress: options.onProgress,
  });
}
