import assert from 'node:assert/strict';
import { evaluateRenderAcceptance, chooseRevisionActions } from '../src/renderQualityPolicy.js';

const rejected=evaluateRenderAcceptance({qa:{passed:true,durationDifferenceSeconds:0},audioExpected:false,cinematicQuality:{score:62,verdict:'REJECT'}});
assert.equal(rejected.accepted,false);
assert.ok(rejected.failures.includes('cinematic-quality-rejected'));
assert.ok(chooseRevisionActions(rejected).includes('run-cinematic-quality-revision'));

const accepted=evaluateRenderAcceptance({qa:{passed:true,durationDifferenceSeconds:0},audioExpected:false,cinematicQuality:{score:91,verdict:'PASS'}});
assert.equal(accepted.accepted,true);
assert.equal(accepted.cinematicQualityScore,91);
console.log('render-acceptance-quality-gate: PASS');
