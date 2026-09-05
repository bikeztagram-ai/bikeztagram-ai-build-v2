import assert from 'node:assert/strict';
import { evaluateRenderAcceptance, chooseRevisionActions } from '../src/renderQualityPolicy.js';

const pass=evaluateRenderAcceptance({qa:{passed:true,durationDifferenceSeconds:.4},audioExpected:true,audioAttached:true,beatSyncScore:.9});
assert.equal(pass.accepted,true);
assert.equal(pass.requiresRevision,false);

const fail=evaluateRenderAcceptance({qa:{passed:false,verdict:'FAIL_DECODE',durationDifferenceSeconds:3},audioExpected:true,audioAttached:false,beatSyncScore:.2});
assert.equal(fail.accepted,false);
assert.ok(fail.failures.includes('FAIL_DECODE'));
assert.ok(fail.failures.includes('required-audio-not-attached'));
assert.ok(fail.failures.includes('weak-music-edit-sync'));
assert.ok(fail.failures.includes('duration-out-of-tolerance'));
assert.deepEqual(chooseRevisionActions(fail),['repair-render-output','retry-audio-mux','retime-cuts-to-musical-phrases','rebalance-cut-durations']);
console.log('render-quality-policy: PASS');
