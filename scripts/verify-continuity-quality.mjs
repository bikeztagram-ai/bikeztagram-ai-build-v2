import assert from 'node:assert/strict';
import {prepareCreativeContinuity} from '../src/creativeContinuityEngine.js';
const good=prepareCreativeContinuity({targetDuration:8,cuts:[
{mediaIndex:0,duration:2,editorialRole:'hook'},{mediaIndex:1,duration:2,editorialRole:'build'},{mediaIndex:2,duration:2,editorialRole:'action'},{mediaIndex:3,duration:2,editorialRole:'hero-ending'}
]},{creativePrompt:'fast cinematic motorcycle action',duration:8});
assert.equal(good.creativeContinuity.continuityVerdict,'PASS');
assert.equal(good.creativeContinuity.repeatedSources,0);
const bad=prepareCreativeContinuity({targetDuration:8,cuts:[
{mediaIndex:0,duration:2,editorialRole:'hook'},{mediaIndex:0,duration:2,editorialRole:'hook'},{mediaIndex:0,duration:2,editorialRole:'hook'},{mediaIndex:0,duration:2,editorialRole:'hook'}
]},{duration:8});
assert.equal(bad.creativeContinuity.continuityVerdict,'REPAIR');
assert.ok(bad.creativeContinuity.repeatedSources>=3);
console.log('CREATIVE CONTINUITY QUALITY PASS');