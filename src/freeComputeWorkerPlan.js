/* BIKEZTAGRAM AI — zero-cost compute orchestration plan.
 * Keeps paid cloud generation disabled. A self-hosted GPU runner can execute
 * the open Wan worker when compatible hardware is online.
 */

export const FREE_WORKER_LABELS = ['self-hosted', 'linux', 'x64', 'bikeztagram-gpu'];

export function chooseFreeWorker({ capability, queued = false } = {}) {
  if (!capability?.available) {
    return { state: 'blocked', reason: 'No compatible free compute available' };
  }
  if (capability.vramGb < 8) {
    return { state: 'blocked', reason: 'Insufficient VRAM for the selected local model' };
  }
  return {
    state: queued ? 'queued' : 'ready',
    labels: FREE_WORKER_LABELS,
    model: 'Wan-AI/Wan2.1-T2V-1.3B',
    resolution: '832x480',
    maxSeconds: 5,
    paidFallback: false,
  };
}

export function generationJobRequest(prompt, capability) {
  const worker = chooseFreeWorker({ capability, queued: true });
  return {
    provider: 'local-open-model',
    worker,
    prompt: String(prompt || '').trim(),
    budget: { currency: 'GBP', maxCost: 0 },
  };
}
