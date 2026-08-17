/* BIKEZTAGRAM AI — zero-cost worker policy.
 * Free cloud notebooks are opportunistic, not guaranteed infrastructure.
 */

const PROVIDERS = {
  kaggle: { name: 'Kaggle', kind: 'free-notebook-gpu', persistent: false },
  colab: { name: 'Google Colab', kind: 'free-notebook-gpu', persistent: false },
  selfHosted: { name: 'Self-hosted GPU', kind: 'user-owned', persistent: true },
};

export function chooseFreeWorker({ available = {}, estimatedMinutes = 5 } = {}) {
  const candidates = [
    available.selfHosted && PROVIDERS.selfHosted,
    available.kaggle && PROVIDERS.kaggle,
    available.colab && PROVIDERS.colab,
  ].filter(Boolean);

  if (!candidates.length) {
    return { status: 'unavailable', provider: null, reason: 'No zero-cost worker is currently available' };
  }

  const worker = candidates[0];
  return {
    status: 'selected',
    provider: worker.name,
    persistent: worker.persistent,
    estimatedMinutes: Math.max(1, Number(estimatedMinutes) || 5),
    paidFallback: false,
  };
}

export function canRunAutonomously(worker) {
  return Boolean(worker?.status === 'selected' && worker?.paidFallback === false && worker?.persistent);
}

export { PROVIDERS };
