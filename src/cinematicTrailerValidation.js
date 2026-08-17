/* BIKEZTAGRAM AI — preflight validation for trailer sessions. £0-only. */

export function validateTrailerSession(session) {
  const errors = [];
  if (!session?.plan?.shots?.length) errors.push('No shots are planned.');
  for (const [index, shot] of (session?.plan?.shots || []).entries()) {
    if (!shot.prompt) errors.push(`Shot ${index + 1} has no generation prompt.`);
    if (!Number.isFinite(Number(shot.duration)) || Number(shot.duration) <= 0) errors.push(`Shot ${index + 1} has invalid duration.`);
    if (!Array.isArray(shot.referenceAssets)) errors.push(`Shot ${index + 1} has invalid reference assets.`);
  }
  return { valid: errors.length === 0, errors };
}

export function getNextPendingShot(session) {
  return (session?.shots || []).find((shot) => shot.status !== 'complete') || null;
}
