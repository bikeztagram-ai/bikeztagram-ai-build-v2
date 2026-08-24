/* Provider-neutral AI Fill Planner V1. Plans missing editorial shots without binding the engine to a generator. */

const COPYRIGHT_SAFE = 'original-content-only';

export function findMissingShots(requiredShots = [], availableShots = []) {
  const available = new Set(availableShots.map((shot) => shot?.id || shot?.assetId || shot?.name).filter(Boolean));
  return requiredShots.filter((shot) => {
    const id = shot?.id || shot?.assetId || shot?.name;
    return id ? !available.has(id) : true;
  });
}

export function createFillJobs(missingShots = [], continuity = {}) {
  return missingShots.map((shot, index) => ({
    jobId: `fill-${shot?.id || index + 1}`,
    sourceShotId: shot?.id || null,
    role: shot?.role || shot?.purpose || 'editorial-fill',
    prompt: shot?.prompt || shot?.description || `Original cinematic shot for ${shot?.role || 'the missing beat'}`,
    duration: Number(shot?.duration || 2),
    subjectIdentity: continuity.subjectIdentity || shot?.subjectIdentity || null,
    environment: continuity.environment || shot?.environment || null,
    lighting: continuity.lighting || shot?.lighting || null,
    cameraContinuity: continuity.cameraContinuity || shot?.cameraContinuity || null,
    contentPolicy: COPYRIGHT_SAFE,
    stylePolicy: 'do-not-imitate-living-artist-or-copyrighted-franchise-style',
  }));
}

export function mergeGeneratedShots(scenePlan = [], generatedShots = []) {
  const generatedBySource = new Map(generatedShots.map((shot) => [shot?.sourceShotId || shot?.jobId, shot]));
  return scenePlan.map((scene) => {
    const generated = generatedBySource.get(scene?.id);
    return generated ? { ...scene, generated: true, media: generated.media || generated.url || generated.asset, generationJobId: generated.jobId } : scene;
  });
}

export function planAiFill({ requiredShots = [], availableShots = [], continuity = {} } = {}) {
  const missingShots = findMissingShots(requiredShots, availableShots);
  return {
    version: 'ai-fill-planner-v1',
    missingShots,
    jobs: createFillJobs(missingShots, continuity),
    policy: COPYRIGHT_SAFE,
  };
}
