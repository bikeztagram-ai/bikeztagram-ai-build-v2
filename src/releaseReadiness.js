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
    protectedInfrastructure: input.protectedInfrastructureIntact !== false,
  };

  if (!checks.contracts) errors.push('Required pipeline contracts are not all verified.');
  if (!checks.pipeline) errors.push('Integrated creative pipeline is not ready.');
  if (!checks.render) errors.push('Render validation has not passed.');
  if (!checks.master) warnings.push('A completed master render has not been observed in this run.');
  if (!checks.platform) warnings.push('Platform export readiness has not been observed in this run.');
  if (!checks.protectedInfrastructure) errors.push('Protected infrastructure integrity check failed.');

  return {
    version: 1,
    ready: errors.length === 0 && checks.pipeline && checks.render,
    checks,
    errors,
    warnings,
    requiredContracts: REQUIRED_CONTRACTS,
    deploymentRecommendation: errors.length === 0 && checks.pipeline && checks.render ? 'candidate-for-single-vercel-deployment' : 'do-not-deploy',
  };
}
