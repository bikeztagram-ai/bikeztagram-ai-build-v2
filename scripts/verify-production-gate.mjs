import assert from 'node:assert/strict';
import { evaluateProductionOutput } from '../src/productionQualityGate.js';
import { deriveRevisionActions, shouldRevise } from '../src/creativeRevisionLoop.js';
const bad=evaluateProductionOutput({blob:new Blob([new Uint8Array(10)]),qa:{verdict:'fail',score:40,reasons:['black render','too short']},audio:{enabled:true,available:false},timeline:{events:[]},generatedScenes:[{copyright:{originalOnly:false}}]});
assert.equal(bad.ok,false);assert.ok(bad.failures.length>=4);
const actions=deriveRevisionActions({qa:{verdict:'fail',score:40,reasons:['black render','too short','repetitive shots']},audio:{enabled:true,available:false},timeline:{events:[]}});assert.ok(actions.some(a=>a.type==='render'));assert.ok(actions.some(a=>a.type==='audio'));assert.equal(shouldRevise({qa:{verdict:'fail',score:40},attempt:1,maxAttempts:2}),true);assert.equal(shouldRevise({qa:{verdict:'fail',score:40},attempt:2,maxAttempts:2}),false);
console.log('production-gate-and-revision: PASS');
