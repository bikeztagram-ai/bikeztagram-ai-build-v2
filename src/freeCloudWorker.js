/* BIKEZTAGRAM AI — zero-cost cloud worker adapter.
 *
 * Free hosted notebook services are useful for development/experiments, but
 * their availability and quotas are not guaranteed. This adapter therefore
 * treats them as an on-demand worker, never as a permanent background host.
 * No billing credentials are accepted by this layer.
 */

const PROVIDERS = {
  kaggle: {
    id: 'kaggle',
    kind: 'free-notebook',
    gpu: true,
    persistent: false,
    unattended: false,
    note: 'Free GPU notebook availability/quota is variable.',
  },
  colab: {
    id: 'colab',
    kind: 'free-notebook',
    gpu: true,
    persistent: false,
    unattended: false,
    note: 'Free GPU availability and limits are dynamic.',
  },
};

export function listFreeCloudProviders() {
  return Object.values(PROVIDERS);
}

export function chooseFreeCloudWorker({ preferred = null, requireGpu = true } = {}) {
  const candidates = Object.values(PROVIDERS).filter((p) => !requireGpu || p.gpu);
  if (preferred && candidates.some((p) => p.id === preferred)) {
    return candidates.find((p) => p.id === preferred);
  }
  return candidates[0] || null;
}

export function createWorkerJob({ provider, prompt, duration = 5, width = 832, height = 480 } = {}) {
  const selected = PROVIDERS[provider];
  if (!selected) throw new Error('No approved free cloud provider selected');
  if (!prompt || !String(prompt).trim()) throw new Error('Generation prompt is required');
  return {
    provider: selected.id,
    mode: selected.kind,
    prompt: String(prompt).trim(),
    duration: Math.min(5, Math.max(1, Number(duration) || 5)),
    width,
    height,
    paidFallback: false,
    unattendedAllowed: false,
    status: 'awaiting-free-worker',
  };
}

export function assertZeroCostPolicy(job) {
  if (!job || job.paidFallback === true) {
    throw new Error('Zero-cost policy violation: paid fallback is disabled');
  }
  if (!PROVIDERS[job.provider]) {
    throw new Error('Zero-cost policy violation: provider is not approved');
  }
  return true;
}
