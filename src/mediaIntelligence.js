/* Unified media intelligence: rank assets without hard-coding a domain. */
export function scoreMediaCandidate(asset = {}, target = {}) {
  const sharpness = Number(asset.sharpness ?? 0.5), composition = Number(asset.composition ?? 0.5), subject = Number(asset.subjectVisibility ?? 0.5), audio = Number(asset.audioQuality ?? 0.5), motion = Number(asset.motionQuality ?? 0.5);
  const desiredMotion = Number(target.motion ?? 0.5);
  const motionFit = 1 - Math.min(1, Math.abs(motion - desiredMotion));
  const score = (sharpness * .24) + (composition * .22) + (subject * .24) + (audio * .12) + (motionFit * .18);
  return { id: asset.id ?? null, score: Number(score.toFixed(4)), signals: { sharpness, composition, subject, audio, motionFit } };
}
export function rankMediaCandidates(assets = [], target = {}) { return assets.map((a) => scoreMediaCandidate(a, target)).sort((a,b) => b.score - a.score); }
