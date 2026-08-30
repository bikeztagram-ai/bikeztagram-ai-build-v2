import assert from 'node:assert/strict';
import { buildUniversalMediaProfile } from '../src/director.js';
const p=buildUniversalMediaProfile([{type:'video',name:'motorcycle accelerating',duration:6},{type:'image',name:'mountain sunset'}]);
assert.equal(p.version,'universal-director-v2');assert.equal(p.mediaCount,2);assert.equal(p.primarySubjectType,'vehicle');
console.log('director-profile-v2: PASS');
