import assert from 'node:assert/strict';
import { renderUniversalProduction } from '../src/universalRenderRuntime.js';

assert.equal(typeof renderUniversalProduction,'function');
// Structural smoke check: renderer receives a plan and the runtime exposes an acceptance gate.
assert.throws(()=>renderUniversalProduction({}),/render plan is required/);
console.log('universal-render-runtime: PASS');
