/* BIKEZTAGRAM AI — deterministic render quality scoring foundation. */

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function scoreRenderIntegrity({
  expectedDuration = 0,
  actualDuration = 0,
  width = 0,
  height = 0,
  hasVideo = false,
  decodedFrames = 0,
  frozenFrames = 0,
  blackFrames = 0,
} = {}) {
  const expected = Math.max(0, num(expectedDuration));
  const actual = Math.max(0, num(actualDuration));
  const durationRatio = expected > 0 ? actual / expected : 0;
  const durationScore = expected > 0 ? Math.min(100, durationRatio * 100) : 0;
  const technical = hasVideo && width > 0 && height > 0 ? 100 : 0;
  const frameCount = Math.max(0, num(decodedFrames));
  const frozenRatio = frameCount > 0 ? Math.min(1, num(frozenFrames) / frameCount) : 1;
  const blackRatio = frameCount > 0 ? Math.min(1, num(blackFrames) / frameCount) : 1;
  const visualScore = Math.max(0, 100 - frozenRatio * 45 - blackRatio * 55);
  const score = Math.round(durationScore * 0.45 + technical * 0.25 + visualScore * 0.30);

  const issues = [];
  if (!hasVideo) issues.push('No playable video output');
  if (expected > 0 && durationRatio < 0.75) issues.push('Rendered output is truncated');
  if (frozenRatio > 0.08) issues.push('Excessive frozen frames');
  if (blackRatio > 0.05) issues.push('Excessive black frames');
  if (width <= 0 || height <= 0) issues.push('Invalid video dimensions');

  return {
    score: Math.max(0, Math.min(100, score)),
    durationRatio: Number(durationRatio.toFixed(3)),
    durationScore: Math.round(durationScore),
    technicalScore: technical,
    visualScore: Math.round(visualScore),
    issues,
    passed: issues.length === 0 && score >= 80,
  };
}

export function compareRenderScores(previous, next) {
  const before = num(previous?.score);
  const after = num(next?.score);
  return {
    delta: after - before,
    improved: after > before,
    regressed: after < before,
    accepted: after >= before && Boolean(next?.passed),
  };
}
