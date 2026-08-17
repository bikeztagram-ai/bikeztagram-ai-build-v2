/* BIKEZTAGRAM AI — generation safety/cost policy. */
const MODELS = {
  fast: 'veo-3.1-fast-generate-preview',
  lite: 'veo-3.1-lite-generate-preview',
  cinematic: 'veo-3.1-generate-preview',
};

export function chooseGenerationPolicy({ quality = 'standard', iterations = 1, userRequestedCinematic = false } = {}) {
  const requested = Number(iterations) || 1;
  const maxIterations = Math.max(1, Math.min(3, requested));
  const model = userRequestedCinematic || quality === 'cinematic'
    ? MODELS.cinematic
    : quality === 'fast'
      ? MODELS.fast
      : MODELS.lite;
  return {
    model,
    maxIterations,
    requiresQualityGate: true,
    requireApprovalForRetry: maxIterations > 1,
  };
}

export function canRegenerate({ attempt = 0, policy } = {}) {
  const max = Number(policy?.maxIterations) || 1;
  return Number(attempt) < max;
}
