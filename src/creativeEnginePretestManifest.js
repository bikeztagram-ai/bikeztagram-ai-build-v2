// Bikeztagram AI — Creative Engine pre-test integration manifest.
// Development-only, side-effect-free contract used to decide whether the
// integrated candidate is allowed to progress toward a deliberate live test.

export const CREATIVE_PRETEST_VERSION = '2.0';

const required = ['director', 'media', 'music', 'video', 'render', 'qa'];

export function buildCreativePretestManifest({ capabilities = {}, contracts = {}, baseline = {} } = {}) {
  const checks = Object.fromEntries(required.map((name) => [name, Boolean(capabilities[name] && contracts[name])]));
  return {
    version: CREATIVE_PRETEST_VERSION,
    baseline,
    checks,
    ready: Object.values(checks).every(Boolean),
    blockedBy: Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name),
    deployment: 'manual-only',
  };
}

export function assertCreativePretestReady(manifest) {
  if (!manifest?.ready) {
    throw new Error(`Creative pre-test blocked: ${(manifest?.blockedBy || ['unknown']).join(', ')}`);
  }
  return manifest;
}
