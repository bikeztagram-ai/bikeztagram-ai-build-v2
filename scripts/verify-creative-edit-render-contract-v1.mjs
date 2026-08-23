import assert from 'node:assert/strict';
import { enhanceCreativeCuts, validateEnhancedCuts } from '../src/creativeEditEnhancerV1.js';
const source=[
 {id:'hook',purpose:'hook',transition:'fade-in',energy:.55},
 {id:'reveal',purpose:'reveal',transition:'crossfade',sourceType:'generated',energy:.8},
 {id:'action',purpose:'action',transition:'whip',energy:.95},
 {id:'hero',purpose:'hero',transition:'cinematic-dissolve',energy:.7}
];
const enhanced=enhanceCreativeCuts(source,{duration:12,music:{energy:.75}});
assert.equal(validateEnhancedCuts(enhanced).pass,true);
assert.equal(enhanced[1].editorial.generatedContinuityCheck,true);
assert.ok(enhanced[1].editorial.effects.zoom>0);
assert.ok(enhanced[2].editorial.effects.speed>1);
assert.equal(enhanced[3].editorial.effects.emphasis,'hero');
assert.ok(enhanced[1].editorial.transitionDuration>0);
console.log('Creative edit → render contract V1: PASS');
