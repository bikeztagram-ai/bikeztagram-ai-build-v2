import assert from 'node:assert/strict';
import { registerCreativeProvider, resolveCreativeProvider, listCreativeProviders, clearCreativeProviders } from '../src/creativeProviderRegistry.js';
import { CREATIVE_CAPABILITIES, capabilitiesFor, hasCapabilities } from '../src/creativeCapabilityRegistry.js';

clearCreativeProviders();
registerCreativeProvider({ id: 'primary-video', capabilities: [CREATIVE_CAPABILITIES.TEXT_TO_VIDEO], priority: 20 });
registerCreativeProvider({ id: 'fallback-video', capabilities: [CREATIVE_CAPABILITIES.TEXT_TO_VIDEO], priority: 80 });
assert.equal(resolveCreativeProvider(CREATIVE_CAPABILITIES.TEXT_TO_VIDEO).id, 'primary-video');
assert.equal(listCreativeProviders(CREATIVE_CAPABILITIES.TEXT_TO_VIDEO).length, 2);
assert.deepEqual(capabilitiesFor('text-to-video'), ['creative-planning', 'text-to-video', 'render']);
assert.equal(hasCapabilities(['creative-planning', 'text-to-video', 'render'], capabilitiesFor('text-to-video')), true);
assert.equal(hasCapabilities(['creative-planning', 'render'], capabilitiesFor('text-to-video')), false);
clearCreativeProviders();
console.log('Provider/capability registry contract: PASS');
