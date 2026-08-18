import assert from 'node:assert/strict';
import { assessReleaseReadiness } from '../src/releaseReadiness.js';

const contracts = {
  'verified-two-stage-director': true,
  'non-destructive-timeline': true,
  'render-bridge': true,
  'platform-reframe': true,
  'platform-export': true,
};

const ready = assessReleaseReadiness({
  contracts,
  pipeline: { ready: true },
  renderValidation: { valid: true },
  masterReady: false,
  platformExport: { valid: false },
  protectedInfrastructureIntact: true,
});
assert.equal(ready.ready, true);
assert.equal(ready.deploymentRecommendation, 'candidate-for-single-vercel-deployment');
assert.equal(ready.errors.length, 0);
assert.ok(ready.warnings.length >= 2);

const blocked = assessReleaseReadiness({
  contracts: { ...contracts, 'render-bridge': false },
  pipeline: { ready: false },
  renderValidation: { valid: false },
  protectedInfrastructureIntact: true,
});
assert.equal(blocked.ready, false);
assert.equal(blocked.deploymentRecommendation, 'do-not-deploy');
assert.ok(blocked.errors.length >= 2);

const infrastructureFailure = assessReleaseReadiness({
  contracts,
  pipeline: { ready: true },
  renderValidation: { valid: true },
  protectedInfrastructureIntact: false,
});
assert.equal(infrastructureFailure.ready, false);
assert.ok(infrastructureFailure.errors.some((item) => item.includes('Protected infrastructure')));

console.log('release-readiness: PASS');
