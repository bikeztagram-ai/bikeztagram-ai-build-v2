import assert from 'node:assert/strict';
import { buildCreativePretestManifest, assertCreativePretestReady } from '../src/creativeEnginePretestManifest.js';

const ready = buildCreativePretestManifest({
  capabilities: { director: true, media: true, music: true, video: true, render: true, qa: true },
  contracts: { director: {}, media: {}, music: {}, video: {}, render: {}, qa: {} },
  baseline: { protected: true },
});
assert.equal(ready.ready, true);
assert.deepEqual(ready.blockedBy, []);
assert.doesNotThrow(() => assertCreativePretestReady(ready));
assert.equal(ready.deployment, 'manual-only');

const blocked = buildCreativePretestManifest({
  capabilities: { director: true, media: true, music: true, video: false, render: true, qa: true },
  contracts: { director: {}, media: {}, music: {}, video: {}, render: {}, qa: {} },
});
assert.equal(blocked.ready, false);
assert.deepEqual(blocked.blockedBy, ['video']);
assert.throws(() => assertCreativePretestReady(blocked), /video/);

console.log('creative-pretest-manifest: PASS');
