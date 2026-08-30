import assert from 'node:assert/strict';
import { buildShotDirection } from '../src/director.js';
const d=buildShotDirection({subjectType:'vehicle',role:'action'});
assert.equal(d.cameraIntent,'escalate-motion');
assert.equal(d.motion.type,'tracking-push-pan');
assert.equal(d.preserveSubject,true);
console.log('director-direction-v2: PASS');
