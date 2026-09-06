import assert from 'node:assert/strict';
import { registerCreativeCapability, getCreativeCapability, listCreativeCapabilities, resolveCreativeCapabilities } from '../src/creativeCapabilityRegistry.js';

registerCreativeCapability({ id: 'verification-capability', kind: 'test', label: 'Verification', providers: ['local'], priority: 99 });
assert.ok(getCreativeCapability('verification-capability'));
assert.ok(listCreativeCapabilities().some((item) => item.id === 'verification-capability'));
assert.equal(resolveCreativeCapabilities(['verification-capability']).length, 1);
assert.equal(resolveCreativeCapabilities(['missing-capability']).length, 0);
assert.ok(listCreativeCapabilities().some((item) => item.id === 'ai-video'));
assert.ok(listCreativeCapabilities().some((item) => item.id === 'ai-music'));
console.log('Universal capability registry v2 verification passed.');
