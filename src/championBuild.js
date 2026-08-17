/* BIKEZTAGRAM AI — champion-build regression gate. */

export function evaluateCandidate(candidate, champion) {
  const next = Number(candidate?.score) || 0;
  const best = Number(champion?.score) || 0;
  const criticalFailure = Array.isArray(candidate?.issues)
    && candidate.issues.some((issue) => /no playable|truncated|invalid video|black frames/i.test(issue));

  return {
    candidateScore: next,
    championScore: best,
    delta: next - best,
    criticalFailure,
    accept: !criticalFailure && Boolean(candidate?.passed) && next >= best,
    reason: criticalFailure
      ? 'candidate contains a critical render failure'
      : next >= best
        ? 'candidate matches or improves champion score'
        : 'candidate regresses against champion',
  };
}

export function championRecord({ commit, deployment, score, timestamp = new Date().toISOString() } = {}) {
  return {
    commit: commit || null,
    deployment: deployment || null,
    score: Number(score) || 0,
    timestamp,
  };
}
