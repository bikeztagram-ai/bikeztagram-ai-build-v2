import assert from 'node:assert/strict';
import { buildUniversalMediaProfile } from '../src/director.js';
const profile=buildUniversalMediaProfile([{type:'video',name:'motorcycle accelerating',duration:6},{type:'image',name:'mountain sunset'}]);
assert.equal(profile.version,'universal-director-v2');
assert.equal(profile.mediaCount,2);
assert.equal(profile.primarySubjectType,'vehicle');
console.log('director-profile-v2: PASS');
