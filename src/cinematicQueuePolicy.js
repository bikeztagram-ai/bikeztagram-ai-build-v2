/* BIKEZTAGRAM AI — queue safety policy. £0-only. */
export function shouldStartCinematicJob({ workerReady = false, cancelled = false, activeJob = false, failed = false } = {}) {
  if (cancelled || failed || activeJob || !workerReady) return false;
  return true;
}

export function shouldAdvanceToNextShot({ status, cancelled = false }) {
  return status === 'complete' && !cancelled;
}

export function shouldRetryCinematicJob({ status, attempts = 0, maxAttempts = 2 }) {
  return !['cancelled', 'complete'].includes(status) && attempts < maxAttempts;
}
