// Bikeztagram AI — Creative Engine ↔ existing browser runtime adapter.
// This is intentionally provider-neutral: the Creative Engine decides WHAT to do;
// the adapter supplies the existing renderer/media contracts without replacing them.

export function normaliseCreativeAssets(assets = []) {
  return assets.map((asset, index) => ({
    id: asset.id || `asset-${index}`,
    name: asset.name || `asset-${index}`,
    type: asset.type || 'unknown',
    sourceUrl: asset.sourceUrl || asset.url || '',
    file: asset.file || null,
  }));
}

export function normaliseDirectorPlan(plan = {}) {
  const cuts = Array.isArray(plan.cuts) ? plan.cuts : Array.isArray(plan.scenes) ? plan.scenes.map((scene, index) => ({
    mediaIndex: scene.mediaIndex ?? index,
    mediaId: scene.mediaId,
    startTime: Number(scene.startTime) || 0,
    duration: Number(scene.duration) || 2,
    purpose: scene.purpose || 'cinematic-scene',
    sourceType: scene.sourceType || 'uploaded',
    generated: scene.generated === true || scene.sourceType === 'generated',
    generationPrompt: scene.generationPrompt || '',
    transition: scene.transitionIn || (index ? 'crossfade' : 'fade-in'),
    motionStyle: scene.motionStyle || 'slow-push',
    motionIntensity: Number(scene.motionIntensity) || 0.9,
    colorGrade: scene.colorGrade || plan.colorGrade || 'cinematic',
  })) : [];

  return {
    ...plan,
    cuts,
    scenes: Array.isArray(plan.scenes) ? plan.scenes : cuts,
    duration: Number(plan.duration || plan.targetDuration || 15),
  };
}

export function createRenderAdapter({ renderProject } = {}) {
  if (typeof renderProject !== 'function') throw new Error('renderProject function is required.');

  return async function renderCreativeJob({ job, plan, onProgress } = {}) {
    if (!job) throw new Error('Creative job is required.');
    const mediaItems = normaliseCreativeAssets(job.assets);
    const directorPlan = normaliseDirectorPlan(plan || job.outputs?.timeline || {});
    if (!directorPlan.cuts.length) throw new Error('Creative render requires at least one director cut.');

    const result = await renderProject(mediaItems, directorPlan, onProgress);
    return {
      result,
      contract: 'bikeztagram-browser-render-v1',
      mediaCount: mediaItems.length,
      cutCount: directorPlan.cuts.length,
      duration: directorPlan.duration,
    };
  };
}

export function validateCreativeRenderContract({ job, plan, render } = {}) {
  const failures = [];
  if (!job?.id) failures.push('missing-job-id');
  if (!Array.isArray(job?.assets)) failures.push('missing-assets');
  if (!Array.isArray(plan?.cuts) || !plan.cuts.length) failures.push('missing-cuts');
  if (render == null) failures.push('missing-render-result');
  return { ok: failures.length === 0, failures };
}
