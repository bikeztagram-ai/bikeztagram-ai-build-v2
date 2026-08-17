/* BIKEZTAGRAM AI — zero-cost cloud/GPU worker adapter.
 *
 * The worker is deliberately separate from Vercel. It runs the actual open
 * video model on an available GPU machine. No billing credentials or paid
 * fallback are accepted here.
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
  selfHosted: {
    id: 'selfHosted',
    kind: 'user-gpu',
    gpu: true,
    persistent: true,
    unattended: true,
    note: 'Optional future laptop/desktop GPU worker.',
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

export function createWorkerJob({
  provider,
  prompt,
  duration = 5,
  width = 832,
  height = 480,
  workerEndpoint = null,
} = {}) {
  const selected = PROVIDERS[provider];
  if (!selected) throw new Error('No approved free cloud provider selected');
  if (!prompt || !String(prompt).trim()) throw new Error('Generation prompt is required');

  return {
    provider: selected.id,
    mode: selected.kind,
    engine: 'wan2.1-t2v-1.3b',
    prompt: String(prompt).trim(),
    duration: Math.min(5, Math.max(1, Number(duration) || 5)),
    width,
    height,
    workerEndpoint: workerEndpoint ? String(workerEndpoint).replace(/\/$/, '') : null,
    paidFallback: false,
    unattendedAllowed: selected.unattended,
    status: 'awaiting-free-worker',
  };
}

export async function submitToGpuWorker(job, { token, fetchImpl = fetch } = {}) {
  assertZeroCostPolicy(job);
  if (!job.workerEndpoint) throw new Error('A free GPU worker endpoint is required');
  if (!token) throw new Error('A worker token is required');

  const response = await fetchImpl(`${job.workerEndpoint}/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bikeztagram-token': token,
    },
    body: JSON.stringify({
      prompt: job.prompt,
      seconds: job.duration,
      width: job.width,
      height: job.height,
    }),
  });

  if (!response.ok) {
    throw new Error(`Free GPU worker returned HTTP ${response.status}`);
  }

  return response;
}

export function assertZeroCostPolicy(job) {
  if (!job || job.paidFallback === true) {
    throw new Error('Zero-cost policy violation: paid fallback is disabled');
  }
  if (!PROVIDERS[job.provider]) {
    throw new Error('Zero-cost policy violation: provider is not approved');
  }
  if (job.engine !== 'wan2.1-t2v-1.3b') {
    throw new Error('Zero-cost policy violation: unapproved generation engine');
  }
  return true;
}
