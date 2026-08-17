/* BIKEZTAGRAM AI — zero-cost guardrail.
 * Never silently invoke a paid generation provider. Paid-only models are blocked
 * unless the application explicitly exposes and receives a future opt-in.
 */

const FREE_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]);

export function isFreeModel(model = '') {
  return FREE_MODELS.has(String(model));
}

export function enforceZeroCostPolicy(request = {}) {
  const model = String(request.model || '');
  if (!isFreeModel(model)) {
    return {
      allowed: false,
      reason: 'Paid video generation is disabled by the zero-cost product policy.',
      model,
    };
  }
  return { allowed: true, model };
}

export function zeroCostGenerationConfig() {
  return {
    paidGenerationEnabled: false,
    autoRegenerationEnabled: false,
    requireFreeProvider: true,
  };
}
