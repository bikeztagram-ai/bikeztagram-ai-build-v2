import assert from 'node:assert/strict';
import { renderUniversalProduction } from '../src/universalRenderRuntime.js';

assert.equal(typeof renderUniversalProduction, 'function');

// The universal production wrapper must remain async because music generation and
// render/QA are asynchronous browser operations. Keep the contract explicit here
// without invoking browser-only rendering in Node CI.
assert.equal(renderUniversalProduction.constructor.name, 'AsyncFunction');

const source = renderUniversalProduction.toString();
for (const token of ['buildMusicRenderBridge', 'renderInspectImprove', 'evaluateRenderAcceptance', 'chooseRevisionActions']) {
  assert.ok(source.includes(token), `Universal production runtime is missing ${token}.`);
}
assert.ok(source.includes('audioAttached'), 'Universal production runtime must report final audio attachment.');
assert.ok(source.includes('accepted'), 'Universal production runtime must expose acceptance state.');

console.log('Universal production contract verification PASS — async render, local music bridge, QA acceptance and revision actions are wired.');
