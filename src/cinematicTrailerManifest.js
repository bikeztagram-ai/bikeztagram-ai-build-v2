/* BIKEZTAGRAM AI — cinematic trailer manifest. £0-only. */

export function buildCinematicTrailerManifest({ brief = '', shots = [], referenceAssets = [], continuity = null } = {}) {
  if (!Array.isArray(shots) || shots.length === 0) throw new Error('No cinematic shots were supplied.');
  return {
    version: 1,
    mode: 'real-ai-generation',
    zeroCostOnly: true,
    brief: String(brief || '').trim(),
    referenceAssets: Array.isArray(referenceAssets) ? referenceAssets : [],
    continuity: continuity || null,
    shots: shots.map((shot, index) => ({
      id: shot.id || `shot-${index + 1}`,
      prompt: String(shot.generationPrompt || shot.prompt || '').trim(),
      durationSeconds: Math.max(1, Math.min(8, Number(shot.duration || 4))),
      aspectRatio: shot.aspectRatio || '16:9',
      referenceAssets: Array.isArray(shot.referenceAssets) ? shot.referenceAssets : undefined,
      continuity: shot.continuity || undefined,
    })),
  };
}

export function validateCinematicTrailerManifest(manifest) {
  if (!manifest || manifest.mode !== 'real-ai-generation') return { ok: false, reason: 'Manifest is not a real AI generation manifest.' };
  if (manifest.zeroCostOnly !== true) return { ok: false, reason: 'Paid generation is not permitted by this pipeline.' };
  if (!Array.isArray(manifest.shots) || !manifest.shots.length) return { ok: false, reason: 'Manifest contains no shots.' };
  const invalid = manifest.shots.find((shot) => !shot.prompt);
  if (invalid) return { ok: false, reason: `Shot ${invalid.id} has no generation prompt.` };
  return { ok: true, shotCount: manifest.shots.length };
}
