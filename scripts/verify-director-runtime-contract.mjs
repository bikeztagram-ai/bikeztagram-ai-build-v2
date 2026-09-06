import assert from 'node:assert/strict';
import { applyDirectorRenderCues, validateDirectorRenderCues } from '../src/directorRenderRuntime.js';
const plan={creativePrompt:'cinematic motorcycle trailer',cuts:[{purpose:'opening'},{purpose:'rider acceleration action'},{purpose:'motorcycle reveal'},{purpose:'hero ending'}]};
const result=applyDirectorRenderCues(plan); const check=validateDirectorRenderCues(result);
assert.equal(check.ok,true,check.errors.join(', '));
assert.equal(result.directorRuntime?.applied,true);
assert.deepEqual(result.directorRuntime?.roles,['hook','action','reveal','hero-ending']);
assert.ok(result.cuts.every(c=>c.directorExecution?.version==='director-render-runtime-v1'));
console.log('Director runtime contract: PASS');
