/* BIKEZTAGRAM AI — render quality/readiness guard.
   Pure validation. It does not alter Blob, Gemini, upload, or music configuration. */

export function validateRenderReadiness({ mediaItems = [], plan = {} } = {}) {
  const issues = [];
  const cuts = Array.isArray(plan.cuts) ? plan.cuts : [];
  if (!cuts.length) issues.push('No render cuts are present.');
  if (!Array.isArray(mediaItems)) issues.push('Source media collection is invalid.');

  let total = 0;
  cuts.forEach((cut, index) => {
    const duration = Number(cut?.duration);
    const isGenerated = cut?.sourceType === 'generated' || cut?.generated === true || cut?.sourceResolution?.generated === true;
    const generatedReady = isGenerated && (cut?.generationStatus === 'ready' || cut?.sourceResolution?.ready === true || Boolean(cut?.assetUrl));
    const mediaIndex = Number(cut?.mediaIndex);

    if (!Number.isFinite(duration) || duration < 0.5 || duration > 4) {
      issues.push(`Cut ${index + 1} has invalid duration.`);
    }

    if (isGenerated) {
      if (!generatedReady) issues.push(`Cut ${index + 1} references a generated asset that is not ready.`);
    } else if (!Number.isInteger(mediaIndex) || !mediaItems[mediaIndex]) {
      issues.push(`Cut ${index + 1} references missing media.`);
    }

    if (!Number.isFinite(Number(cut?.startTime)) || Number(cut.startTime) < 0) {
      issues.push(`Cut ${index + 1} has invalid source time.`);
    }
    total += Number.isFinite(duration) ? duration : 0;
  });

  const target = Number(plan.targetDuration || 15);
  if (Math.abs(total - target) > 0.75) issues.push(`Timeline duration ${total.toFixed(2)}s is outside target tolerance.`);

  return {
    ready: issues.length === 0,
    issues,
    totalDuration: Number(total.toFixed(3)),
    targetDuration: target,
    cutCount: cuts.length
  };
}

export function assertRenderReadiness(input) {
  const result = validateRenderReadiness(input);
  if (!result.ready) throw new Error(`Render readiness failed: ${result.issues.join(' ')}`);
  return result;
}
