import assert from 'node:assert/strict';
import { scoreCreativeOutput, buildAcceptanceReport } from '../src/creativeEngineAcceptance.js';

const accepted = scoreCreativeOutput({
  plan: { cuts: [{ mediaIndex: 0 }] },
  render: { playable: true },
  qa: { score: 0.92 },
  exportInfo: { format: 'mp4' },
});
assert.equal(accepted.accepted, true);
assert.equal(accepted.score, 1);

const blocked = buildAcceptanceReport({
  job: { id: 'job-1' },
  plan: { cuts: [] },
  render: null,
  qa: { score: 0.4 },
});
assert.equal(blocked.accepted, false);
assert.equal(blocked.nextAction, 'revise');
assert.ok(blocked.blockers.includes('hasCuts'));
assert.ok(blocked.blockers.includes('hasRender'));
assert.ok(blocked.blockers.includes('qaThreshold'));

console.log('creative-acceptance: PASS');
