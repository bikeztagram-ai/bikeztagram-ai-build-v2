/* BIKEZTAGRAM AI — zero-cost generation capability detector. */

const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

export const FREE_GENERATION_TARGETS = Object.freeze({
  wan21T2V13B: {
    id: 'wan2.1-t2v-1.3b',
    resolution: '480p',
    minVramGb: 8.19,
    audioNative: false,
  },
});

export function detectFreeGenerationCapability({
  gpuAvailable = false,
  vramGb = 0,
  localRuntime = false,
  modelInstalled = false,
  cpuOnly = false,
} = {}) {
  const vram = num(vramGb);
  const localWanReady = gpuAvailable && vram >= 8.19 && localRuntime && modelInstalled;

  return {
    free: true,
    localWanReady,
    recommendedModel: localWanReady ? FREE_GENERATION_TARGETS.wan21T2V13B.id : null,
    recommendedResolution: localWanReady ? '480p' : null,
    reasons: localWanReady
      ? ['local open model available', 'sufficient VRAM detected']
      : [
          cpuOnly ? 'CPU-only generation is not a practical default' : 'no compatible local GPU runtime detected',
          !modelInstalled ? 'free model is not installed' : null,
          !localRuntime ? 'local generation runtime is unavailable' : null,
        ].filter(Boolean),
    paidFallbackAllowed: false,
  };
}

export function canStartFreeGeneration(capability) {
  return Boolean(capability?.free && capability?.localWanReady && !capability?.paidFallbackAllowed);
}
