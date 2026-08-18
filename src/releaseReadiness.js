const REQUIRED_CONTRACTS = Object.freeze([
  'verified-two-stage-director',
  'non-destructive-timeline',
  'render-bridge',
  'platform-reframe',
  'platform-export',
]);

export function assessReleaseReadiness(input = {}) {
  const errors = [];
  const warnings = [];
  const checks = {
    contracts: REQUIRED_CONTRACTS.every((name) => input.contracts?.[name] === true),
    pipeline: input.pipeline?.ready === true,
    render: input.renderValidation?.valid === true,
    master: input.masterReady === true,
    platform: input.platformExport?.valid === true,
    protectedInfrastructure: input.protectedInfrastructureIntact === true,
  };

  if (!checks.contracts) errors.push('Required pipeline contracts are not all verified.');
  if (!checks.pipeline) errors.push('Integrated creative pipeline is not ready.');
  if (!checks.render) errors.push('Render validation has not passed.');
  if (!checks.master) warnings.push('A completed master render has not been observed in this run.');
  if (!checks.platform) warnings.push('Platform export readiness has not been observed in this run.');
  if (!checks.protectedInfrastructure) errors.push('Protected infrastructure integrity check failed.');

  const executionEvidence = checks.master && checks.platform;
  if (!executionEvidence) warnings.push('Full end-to-end render/export evidence is still required before release sign-off.');

  const ready = errors.length === 0 && checks.pipeline && checks.render && executionEvidence;
  return {
    version: 2,
    ready,
    checks,
    errors,
    warnings,
    requiredContracts: REQUIRED_CONTRACTS,
    deploymentRecommendation: ready ? 'candidate-for-single-vercel-deployment' : 'do-not-deploy',
  };
}
