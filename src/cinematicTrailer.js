/* BIKEZTAGRAM AI — cinematic trailer orchestration.
 * Connects the shot generator to the existing browser renderer so the product
 * can turn a reference-backed generation plan into one playable trailer blob.
 */
import { generateCinematicShots, releaseGeneratedCinematicClips } from './cinematicGenerationRunner.js';
import { renderProject } from './renderer.js';

export async function generateCinematicTrailer({
  brief,
  subject = 'the rider and their motorcycle',
  world = 'original fictional open-world city',
  visualStyle = 'cinematic open-world action trailer',
  durationSeconds = 30,
  aspectRatio = '16:9',
  referenceAssets = [],
  onProgress = () => {},
} = {}) {
  let generated = null;
  try {
    generated = await generateCinematicShots({
      brief,
      subject,
      world,
      visualStyle,
      durationSeconds,
      aspectRatio,
      referenceAssets,
      onProgress,
    });

    const cuts = generated.clips.map((clip, index) => ({
      mediaId: clip.id,
      mediaIndex: index,
      startTime: 0,
      duration: clip.duration,
      purpose: clip.purpose,
      sourceType: 'generated',
      generated: true,
      generationPrompt: clip.generationPrompt,
      transition: clip.transition,
      motionStyle: clip.motionStyle,
      motionIntensity: 0.75,
      speed: 1,
      speedEnd: 1,
      colorGrade: clip.colorGrade,
      stabilization: false,
    }));

    const renderPlan = {
      title: 'AI Cinematic Trailer',
      style: visualStyle,
      creativePrompt: brief,
      colorGrade: 'dark-cinematic',
      cuts,
      duration: cuts.reduce((sum, cut) => sum + cut.duration, 0),
      targetDuration: generated.plan.durationSeconds,
      source: 'cinematic-generation-runner',
      mode: 'generated-trailer',
    };

    onProgress({ stage: 'assembling-trailer', progress: 96 });
    const outputBlob = await renderProject(generated.mediaItems, renderPlan, (value) => {
      onProgress({ stage: 'rendering-trailer', progress: 96 + Math.round((Number(value) || 0) * 0.04) });
    });

    if (!(outputBlob instanceof Blob) || !outputBlob.size) {
      throw new Error('Cinematic trailer renderer produced an empty video.');
    }

    onProgress({ stage: 'complete', progress: 100 });
    return { ...generated, renderPlan, outputBlob, status: 'complete' };
  } catch (error) {
    throw error;
  } finally {
    if (generated && generated.status !== 'complete') releaseGeneratedCinematicClips(generated);
  }
}
