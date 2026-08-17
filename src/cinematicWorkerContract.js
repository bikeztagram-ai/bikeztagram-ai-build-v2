/* BIKEZTAGRAM AI — free GPU worker contract. £0-only. */
export const FREE_GPU_WORKER_CONTRACT = Object.freeze({ version: 1, health: '/health', generate: '/generate', contentType: 'video/*', zeroCostOnly: true });

export function validateWorkerHealth(payload) {
  return Boolean(payload && (payload.ready === true || payload.status === 'ok' || payload.healthy === true));
}

export function buildWorkerGenerationRequest({ prompt, durationSeconds = 4, aspectRatio = '16:9', referenceAssets = [], continuity = null, shotId }) {
  if (!prompt?.trim()) throw new Error('Worker generation requires a prompt.');
  return { prompt: prompt.trim(), durationSeconds, aspectRatio, referenceAssets, continuity, shotId, zeroCostOnly: true, contractVersion: FREE_GPU_WORKER_CONTRACT.version };
}
