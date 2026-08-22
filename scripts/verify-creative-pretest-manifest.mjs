import { buildCreativePretestManifest, assertCreativePretestReady } from '../src/creativeEnginePretestManifest.js';

const names = ['director', 'media', 'music', 'video', 'render', 'qa'];
const capabilities = Object.fromEntries(names.map((name) => [name, true]));
const contracts = Object.fromEntries(names.map((name) => [name, { version: 1 }]));
const manifest = buildCreativePretestManifest({ capabilities, contracts, baseline: { protected: true } });
assertCreativePretestReady(manifest);
if (manifest.deployment !== 'manual-only') throw new Error('Deployment mode is not manual-only');
console.log('creative-pretest-readiness: PASS');
