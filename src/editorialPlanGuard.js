/* BIKEZTAGRAM AI — pre-render editorial plan guard.
   Rejects malformed plans before they reach the browser renderer. */

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isGeneratedCut(cut) {
  return Boolean(cut?.generated || cut?.sourceType === 'generated' || cut?.sourceType === 'procedural' || cut?.generationPrompt);
}

function hasMediaReference(cut, mediaItems) {
  if (cut?.mediaId != null && mediaItems.some((item) => String(item?.id) === String(cut.mediaId))) return true;
  const index = finite(cut?.mediaIndex);
  return index != null && Number.isInteger(index) && index >= 0 && index < mediaItems.length;
}

export function validateExecutablePlan(plan, mediaItems = []) {
  const errors = [];
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : Array.isArray(plan?.scenes) ? plan.scenes : [];
  const items = Array.isArray(mediaItems) ? mediaItems : [];
  if (!cuts.length) errors.push('plan contains no executable cuts');
  if (!items.length) errors.push('plan has no media items available');

  let totalDuration = 0;
  cuts.forEach((cut, index) => {
    const label = `cut ${index + 1}`;
    const duration = finite(cut?.duration);
    if (duration == null || duration < 0.5 || duration > 60) errors.push(`${label}: duration must be between 0.5 and 60 seconds`);
    else totalDuration += duration;

    const generated = isGeneratedCut(cut);
    if (generated) {
      const prompt = String(cut?.generationPrompt || cut?.prompt || '').trim();
      if (!prompt) errors.push(`${label}: generated cut has no generation prompt`);
    } else if (!hasMediaReference(cut, items)) {
      errors.push(`${label}: uploaded cut has no valid media reference`);
    }

    const sourceIndex = finite(cut?.mediaIndex ?? cut?.sourceIndex);
    if (sourceIndex != null && (!Number.isInteger(sourceIndex) || sourceIndex < 0)) errors.push(`${label}: media index is invalid`);
  });

  const targetDuration = finite(plan?.targetDuration ?? plan?.duration);
  if (targetDuration != null && targetDuration > 0 && totalDuration > targetDuration * 1.25 + 0.5) {
    errors.push(`plan duration ${totalDuration.toFixed(2)}s exceeds target ${targetDuration.toFixed(2)}s by more than 25%`);
  }

  return {
    valid: errors.length === 0,
    errors,
    cutCount: cuts.length,
    totalDuration: Number(totalDuration.toFixed(2)),
    targetDuration: targetDuration == null ? null : Number(targetDuration.toFixed(2))
  };
}

export function assertExecutablePlan(plan, mediaItems = []) {
  const result = validateExecutablePlan(plan, mediaItems);
  if (!result.valid) throw new Error(`Editorial plan validation failed: ${result.errors.join('; ')}`);
  return result;
}
