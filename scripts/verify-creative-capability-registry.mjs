import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry = fs.readFileSync(new URL('../docs/creative-capability-registry.md', import.meta.url), 'utf8');
for (const capability of ['creative intent', 'scene/world', 'subject and asset', 'camera direction', 'timeline', 'transitions', 'music', 'render backends', 'quality criticism']) {
  assert.match(registry, new RegExp(capability, 'i'));
}
assert.match(registry, /provider-neutral/i);
assert.match(registry, /Gemini is excluded/i);
console.log('creative-capability-registry: PASS');
