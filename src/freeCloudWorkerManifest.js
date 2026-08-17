/* BIKEZTAGRAM AI — free-cloud worker manifest.
 * Creates a portable job description for temporary GPU notebooks.
 * No credentials, paid endpoints, or persistent-cloud assumptions.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));

export function createFreeWorkerJob({
  jobId,
  prompt,
  model = 'Wan2.1-T2V-1.3B',
  width = 832,
  height = 480,
  frames = 81,
  seed = -1,
} = {}) {
  if (!jobId) throw new Error('jobId is required');
  if (!String(prompt || '').trim()) throw new Error('prompt is required');

  return {
    schema: 'bikeztagram-free-worker-v1',
    jobId,
    model,
    prompt: String(prompt).trim(),
    width: clamp(width, 320, 1024),
    height: clamp(height, 240, 576),
    frames: clamp(frames, 17, 121),
    seed: Number.isInteger(seed) ? seed : -1,
    costPolicy: 'ZERO_GBP_ONLY',
    allowedWorkers: ['kaggle-free', 'colab-free', 'self-hosted-free'],
    paidFallback: false,
    expectedOutput: 'mp4',
    createdAt: new Date().toISOString(),
  };
}

export function workerCapabilities(provider = {}) {
  return {
    provider: provider.name || 'unknown',
    free: provider.free === true,
    gpu: provider.gpu === true,
    available: provider.available === true,
    modelSupported: provider.models?.includes?.('Wan2.1-T2V-1.3B') === true,
    canAcceptJob: provider.free === true && provider.gpu === true && provider.available === true,
  };
}

export function chooseFreeWorker(workers = []) {
  const eligible = workers
    .map(workerCapabilities)
    .filter((worker) => worker.canAcceptJob && worker.modelSupported);

  return eligible[0] || null;
}
