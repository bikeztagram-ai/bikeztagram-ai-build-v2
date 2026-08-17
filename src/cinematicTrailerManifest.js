/* BIKEZTAGRAM AI — cinematic trailer manifest. £0-only. */

export function buildCinematicTrailerManifest({ brief = '', shots = [], referenceAssets = [], continuity = null } = {}) {
  if (!Array.isArray(shots) || shots.length === 0) throw new Error('No cinematic shots were supplied.');
  return {
    version: 2,
    mode: 'real-ai-generation',
    zeroCostOnly: true,
    id: `trailer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brief: String(brief || '').trim(),
    referenceAssets: Array.isArray(referenceAssets) ? [...referenceAssets] : [],
    continuity: continuity || null,
    status: 'queued',
    completedShotIds: [],
    shots: shots.map((shot, index) => ({
      id: shot.id || `shot-${index + 1}`,
      prompt: String(shot.generationPrompt || shot.prompt || '').trim(),
      durationSeconds: Math.max(1, Math.min(8, Number(shot.duration || 4))),
      aspectRatio: shot.aspectRatio || '16:9',
      referenceAssets: Array.isArray(shot.referenceAssets) ? shot.referenceAssets : undefined,
      continuity: shot.continuity || undefined,
      status: 'queued',
      attempts: 0,
      error: null,
      result: null,
    })),
  };
}

export function validateCinematicTrailerManifest(manifest) {
  if (!manifest || !['real-ai-generation'].includes(manifest.mode)) return { ok: false, reason: 'Manifest is not a real AI generation manifest.' };
  if (manifest.zeroCostOnly !== true) return { ok: false, reason: 'Paid generation is not permitted by this pipeline.' };
  if (!Array.isArray(manifest.shots) || !manifest.shots.length) return { ok: false, reason: 'Manifest contains no shots.' };
  const invalid = manifest.shots.find((shot) => !shot.prompt);
  if (invalid) return { ok: false, reason: `Shot ${invalid.id} has no generation prompt.` };
  return { ok: true, shotCount: manifest.shots.length };
}

export function markShotStarted(manifest, shotId) {
  return patchShot(manifest, shotId, { status: 'generating', attempts: (findShot(manifest, shotId)?.attempts || 0) + 1, error: null });
}

export function markShotSucceeded(manifest, shotId, result) {
  const next = patchShot(manifest, shotId, { status: 'complete', error: null, result });
  const completedShotIds = next.shots.filter((shot) => shot.status === 'complete').map((shot) => shot.id);
  return { ...next, completedShotIds, status: completedShotIds.length === next.shots.length ? 'complete' : 'generating', updatedAt: new Date().toISOString() };
}

export function markShotFailed(manifest, shotId, error) {
  return patchShot(manifest, shotId, { status: 'failed', error: error?.message || String(error), updatedAt: new Date().toISOString() });
}

export function resumePendingShots(manifest) {
  return {
    ...manifest,
    status: manifest.shots.every((shot) => shot.status === 'complete') ? 'complete' : 'queued',
    shots: manifest.shots.map((shot) => shot.status === 'generating' ? { ...shot, status: 'queued', error: 'Recovered after interrupted run.' } : shot),
    updatedAt: new Date().toISOString(),
  };
}

export function getNextRunnableShot(manifest) {
  return manifest?.shots?.find((shot) => shot.status === 'queued' || (shot.status === 'failed' && (shot.attempts || 0) < 2)) || null;
}

function findShot(manifest, shotId) {
  return manifest?.shots?.find((shot) => shot.id === shotId) || null;
}

function patchShot(manifest, shotId, patch) {
  return {
    ...manifest,
    updatedAt: new Date().toISOString(),
    shots: manifest.shots.map((shot) => shot.id === shotId ? { ...shot, ...patch } : shot),
  };
}
