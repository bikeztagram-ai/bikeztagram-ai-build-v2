import assert from 'node:assert/strict';
import { renderUniversalProduction } from '../src/universalRenderRuntime.js';
import { evaluateRenderAcceptance, chooseRevisionActions } from '../src/renderQualityPolicy.js';

assert.equal(typeof renderUniversalProduction,'function');
assert.throws(()=>renderUniversalProduction({}),/render plan is required/);
const accepted=evaluateRenderAcceptance({qa:{passed:true,verdict:'PASS',durationDifferenceSeconds:.2},audioExpected:true,audioAttached:true,beatSyncScore:.8});
assert.equal(accepted.accepted,true);
const rejected=evaluateRenderAcceptance({qa:{passed:false,verdict:'FAIL_DECODE',durationDifferenceSeconds:2.8},audioExpected:true,audioAttached:false,beatSyncScore:.1});
assert.equal(rejected.accepted,false);
assert.deepEqual(chooseRevisionActions(rejected),['repair-render-output','retry-audio-mux','retime-cuts-to-musical-phrases','rebalance-cut-durations']);
console.log('universal-render-runtime: PASS');
