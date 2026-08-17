/* BIKEZTAGRAM AI — zero-cost local generation worker contract.
 * This module intentionally never calls a paid hosted generation API.
 * The worker expects a locally installed/open model runtime.
 */

export const FREE_GENERATION_MODEL = {
  id: 'Wan2.1-T2V-1.3B',
  source: 'Wan-AI/Wan2.1-T2V-1.3B',
  mode: 'text-to-video',
  recommendedResolution: '832x480',
  minVramGb: 8.19,
  license: 'Apache-2.0',
};

export function canRunFreeGeneration(capabilities = {}) {
  const vram = Number(capabilities.vramGb) || 0;
  return Boolean(
    capabilities.localRuntime &&
    capabilities.modelInstalled &&
    capabilities.gpu &&
    vram >= FREE_GENERATION_MODEL.minVramGb
  );
}

export function createFreeGenerationJob({ prompt, durationSeconds = 5, width = 832, height = 480 } = {}) {
  if (!prompt || !String(prompt).trim()) throw new Error('A generation prompt is required');
  return {
    provider: 'local-open-model',
    model: FREE_GENERATION_MODEL.id,
    prompt: String(prompt).trim(),
    durationSeconds: Math.max(1, Math.min(5, Number(durationSeconds) || 5)),
    width,
    height,
    paidFallback: false,
    status: 'queued',
  };
}

export function freeGenerationFailure(capabilities = {}) {
  return {
    code: 'FREE_COMPUTE_UNAVAILABLE',
    message: 'No compatible local free video-generation runtime is available. Paid generation is disabled by product policy.',
    capabilities,
  };
}
