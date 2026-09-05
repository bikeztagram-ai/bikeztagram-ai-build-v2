/* BIKEZTAGRAM AI — No-Gemini runtime policy.
   Creative Engine execution must not depend on Gemini or any remote AI provider.
   Provider adapters remain optional; deterministic/local fallbacks are mandatory. */

const FORBIDDEN_PROVIDER_NAMES = ['gemini', '@google/genai'];

export function assertNoGeminiRuntime(adapters = {}) {
  const serialised = JSON.stringify(adapters || {}).toLowerCase();
  for (const name of FORBIDDEN_PROVIDER_NAMES) {
    if (serialised.includes(name.toLowerCase())) {
      throw new Error(`No-Gemini runtime policy violation: ${name} is present in the execution adapter graph.`);
    }
  }
  return { allowed: true, provider: 'none', policy: 'no-gemini-runtime-v1' };
}

export function createNoGeminiRuntime({ localAdapters = {}, fallbacks = {} } = {}) {
  assertNoGeminiRuntime(localAdapters);
  return {
    version: 'no-gemini-runtime-v1',
    provider: 'none',
    localAdapters,
    fallbacks,
    policy: {
      remoteGeminiAllowed: false,
      clientGeminiAllowed: false,
      deterministicFallbackRequired: true,
      originalGenerationOnly: true,
    },
  };
}
