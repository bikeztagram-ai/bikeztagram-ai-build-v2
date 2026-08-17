/* BIKEZTAGRAM AI — £0 generation policy.
 * Paid hosted video APIs are never selected automatically.
 * The preferred path is local/open-source generation when compute is available.
 */

const FREE_MODELS = new Set([
  'wan2.1-t2v-1.3b-local',
  'wan2.1-t2v-14b-local',
  'wan2.2-t2v-14b-local',
]);

export function selectFreeGenerationRoute({ requestedModel = '', hasLocalGpu = false, quality = 'standard' } = {}) {
  const requested = String(requestedModel || '').toLowerCase();
  if (FREE_MODELS.has(requested)) return { allowed: true, model: requested, reason: 'explicit local open-source model' };
  if (!hasLocalGpu) {
    return {
      allowed: false,
      model: null,
      reason: 'No genuinely free video-generation compute is available; paid hosted APIs are blocked by the £0 policy.',
      next: 'Use a local/self-hosted open-source model when compute is available.',
    };
  }
  return {
    allowed: true,
    model: quality === 'high' ? 'wan2.1-t2v-14b-local' : 'wan2.1-t2v-1.3b-local',
    reason: 'local open-source generation',
  };
}

export function assertFreeGeneration(route) {
  if (!route?.allowed || !FREE_MODELS.has(route.model)) {
    throw new Error('£0 policy blocked this generation route. No paid provider may be invoked.');
  }
  return route;
}
