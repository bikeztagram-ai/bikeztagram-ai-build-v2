/* BIKEZTAGRAM AI — £0 generation worker failover.
 * Never selects a paid provider. Free workers are opportunistic and disposable.
 */

const PRIORITY = ['kaggle', 'colab', 'self-hosted'];

export function chooseFreeWorker(workers = [], now = Date.now()) {
  return workers
    .filter((w) => w && w.enabled !== false && w.cost === 0 && (!w.availableUntil || new Date(w.availableUntil).getTime() > now))
    .filter((w) => !Number.isFinite(w.remainingMinutes) || w.remainingMinutes > 0)
    .sort((a, b) => {
      const pa = PRIORITY.indexOf(a.type);
      const pb = PRIORITY.indexOf(b.type);
      return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
    })[0] || null;
}

export function createGenerationQueueItem({ id, prompt, duration = 5 } = {}) {
  return {
    id,
    prompt,
    duration,
    costPolicy: 'ZERO_GBP',
    status: 'waiting-for-free-worker',
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
    workerHistory: [],
    paidFallback: false,
  };
}

export function handleWorkerExhaustion(job, reason = 'No free GPU worker currently available', worker = null) {
  const attempts = (job?.attempts || 0) + 1;
  return {
    ...job,
    status: 'waiting-for-free-worker',
    attempts,
    lastError: reason,
    nextAction: 'retry-when-free-worker-available',
    workerHistory: [...(job?.workerHistory || []), worker].filter(Boolean),
    paidFallback: false,
  };
}

export function canRetryFree(job) {
  return Boolean(job) && job.costPolicy === 'ZERO_GBP' && job.paidFallback !== true && (job.attempts || 0) < (job.maxAttempts || 3);
}
