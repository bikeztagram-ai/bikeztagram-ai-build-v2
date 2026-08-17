/* BIKEZTAGRAM AI — resilient cinematic generation state machine. £0-only. */

export function createGenerationState(shots = []) {
  return { status: 'idle', total: Array.isArray(shots) ? shots.length : 0, completed: 0, currentShot: null, progress: 0, results: [], error: null };
}

export function markGenerationStarted(state, shotId) {
  return { ...state, status: 'generating', currentShot: shotId, error: null };
}

export function markShotComplete(state, result) {
  const results = [...(state.results || []), result];
  const completed = results.length;
  const total = Math.max(0, state.total || completed);
  return { ...state, status: completed >= total && total > 0 ? 'complete' : 'generating', completed, currentShot: completed >= total ? null : state.currentShot, progress: total ? Math.round((completed / total) * 100) : 0, results, error: null };
}

export function markGenerationFailed(state, error, shotId = state.currentShot) {
  return { ...state, status: 'error', currentShot: shotId, error: error?.message || String(error) };
}
