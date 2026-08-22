import assert from 'node:assert/strict';
import { createCreativeFixture } from '../src/creativeEngineTestFixtures.js';
import { buildAcceptanceReport } from '../src/creativeEngineAcceptance.js';
import { normaliseCreativeAssets, normaliseDirectorPlan, validateCreativeRenderContract } from '../src/creativeEngineRuntimeAdapter.js';

const fixture = createCreativeFixture();
const assets = normaliseCreativeAssets(fixture.job.assets);
const plan = normaliseDirectorPlan(fixture.plan);
const acceptance = buildAcceptanceReport({
  job: fixture.job,
  plan,
  render: fixture.render,
  qa: fixture.qa,
  exportInfo: fixture.exportInfo,
});

assert.equal(assets.length, 2);
assert.equal(plan.cuts.length, 2);
assert.equal(acceptance.accepted, true);
assert.equal(acceptance.nextAction, 'export');
assert.equal(validateCreativeRenderContract({ job: fixture.job, plan, render: fixture.render }).ok, true);

const failed = createCreativeFixture({ qa: { score: 0.4 }, render: { playable: false } });
const failedReport = buildAcceptanceReport({
  job: failed.job,
  plan: failed.plan,
  render: failed.render,
  qa: failed.qa,
});
assert.equal(failedReport.accepted, false);
assert.equal(failedReport.nextAction, 'revise');

console.log('creative-engine-integration: PASS');
