import { buildCreativePretestManifest, assertCreativePretestReady } from '../src/creativeEnginePretestManifest.js';

const names = ['director', 'media', 'music', 'video', 'render', 'qa'];
const capabilities = Object.fromEntries(names.map((name) => [name, true]));
const contracts = Object.fromEntries(names.map((name) => [name, { version: 1 }]));

const manifest = buildCreativePretestManifest({
  capabilities,
  contracts,
  baseline: { protected: true, source: 'integration/pretest-consolidated-01' },
});

assertCreativePretestReady(manifest);
if (manifest.deployment !== 'manual-only') throw new Error('Pre-test deployment must remain manual-only');
if (manifest.baseline.protected !== true) throw new Error('Protected baseline is required');

console.log(JSON.stringify({ ok: true, stage: 'pretest-candidate', deployment: manifest.deployment }));
