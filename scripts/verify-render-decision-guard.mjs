import assert from 'node:assert/strict';
import { guardRenderPlan } from '../src/renderDecisionGuard.js';
const plan=guardRenderPlan({cuts:[{mediaIndex:0,duration:8,motionStyle:'slow-push'},{mediaIndex:0,duration:.1,motionStyle:'slow-push'},{mediaIndex:1,duration:2,motionStyle:'pan-right'}]});
assert.ok(plan.cuts.every(c=>c.duration>=.5&&c.duration<=6)); assert.ok(plan.renderGuard); assert.ok(new Set(plan.cuts.map(c=>c.motionStyle)).size>=2);
console.log('Render decision guard: PASS');
