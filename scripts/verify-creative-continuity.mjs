import assert from 'node:assert/strict';
import { prepareCreativeContinuity } from '../src/creativeContinuityEngine.js';

const plan={targetDuration:15,cuts:[
  {mediaIndex:0,duration:2,purpose:'opening'},
  {mediaIndex:1,duration:2,purpose:'build'},
  {mediaIndex:2,duration:2,purpose:'action'},
  {mediaIndex:1,duration:2,purpose:'detail'},
  {mediaIndex:3,duration:2,purpose:'hero-ending'}
]};
const out=prepareCreativeContinuity(plan,{creativePrompt:'fast cinematic motorcycle chase at night',duration:10});
assert.equal(out.creativeContinuity.action,true);
assert.equal(out.creativeContinuity.dark,true);
assert.equal(out.cuts.length,5);
assert.equal(out.cuts[0].transition,'fade-in');
assert.equal(out.cuts.at(-1).transition,'fade-out');
assert.ok(out.cuts.some(c=>c.transition==='whip-right'||c.transition==='flash-cut'));
assert.ok(out.cuts.some(c=>c.repetitionPenalty===1));
assert.ok(out.cuts.every(c=>c.continuity && Number.isInteger(c.continuity.shotIndex)));
console.log('creative-continuity: PASS');
