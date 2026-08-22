import assert from 'node:assert/strict';
import { normaliseCreativeAssets, normaliseDirectorPlan, createRenderAdapter, validateCreativeRenderContract } from '../src/creativeEngineRuntimeAdapter.js';

const assets = normaliseCreativeAssets([{ name: 'bike.mp4', type: 'video/mp4', url: 'blob:test' }]);
assert.equal(assets[0].sourceUrl, 'blob:test');

const plan = normaliseDirectorPlan({
  targetDuration: 12,
  scenes: [{ mediaIndex: 0, duration: 2.5, purpose: 'reveal', motionStyle: 'slow-push' }],
});
assert.equal(plan.cuts.length, 1);
assert.equal(plan.cuts[0].duration, 2.5);
assert.equal(plan.duration, 12);

let called = false;
const adapter = createRenderAdapter({
  renderProject: async (media, renderPlan) => {
    called = true;
    assert.equal(media.length, 1);
    assert.equal(renderPlan.cuts.length, 1);
    return { blob: true };
  },
});

const result = await adapter({ job: { id: 'creative-1', assets }, plan });
assert.equal(called, true);
assert.equal(result.contract, 'bikeztagram-browser-render-v1');
assert.equal(result.cutCount, 1);
assert.equal(validateCreativeRenderContract({ job: { id: 'creative-1', assets }, plan, render: result }).ok, true);
assert.equal(validateCreativeRenderContract({ job: {}, plan: {}, render: null }).ok, false);

console.log('creative-runtime-adapter: PASS');
