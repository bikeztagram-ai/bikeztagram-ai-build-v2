/* BIKEZTAGRAM AI — canonical cinematic trailer plan. £0-only. */

export function buildTrailerPlan({ brief = '', shots = [], aspectRatio = '16:9', fps = 30 } = {}) {
  const safeShots = Array.isArray(shots) ? shots : [];
  return {
    version: 1,
    brief: String(brief).trim(),
    aspectRatio,
    fps: Number(fps) || 30,
    zeroCostOnly: true,
    shotCount: safeShots.length,
    shots: safeShots.map((shot, index) => ({
      id: shot.id || `shot-${index + 1}`,
      order: index + 1,
      prompt: String(shot.generationPrompt || shot.prompt || '').trim(),
      generationPrompt: String(shot.generationPrompt || shot.prompt || '').trim(),
      duration: Math.max(1, Number(shot.duration) || 4),
      aspectRatio: shot.aspectRatio || aspectRatio,
      referenceAssets: Array.isArray(shot.referenceAssets) ? shot.referenceAssets : [],
      continuity: shot.continuity || null,
    })),
  };
}

export function validateTrailerPlan(plan) {
  const errors = [];
  if (!plan?.brief) errors.push('Trailer brief is missing.');
  if (!Array.isArray(plan?.shots) || plan.shots.length === 0) errors.push('Trailer has no shots.');
  for (const [index, shot] of (plan?.shots || []).entries()) {
    if (!shot.prompt) errors.push(`Shot ${index + 1} has no prompt.`);
    if (!Number.isFinite(Number(shot.duration)) || Number(shot.duration) <= 0) errors.push(`Shot ${index + 1} has invalid duration.`);
    if (!Array.isArray(shot.referenceAssets)) errors.push(`Shot ${index + 1} has invalid references.`);
  }
  return { valid: errors.length === 0, errors };
}
