import assert from 'node:assert/strict';
import { buildShotDirection } from '../src/director.js';
assert.equal(buildShotDirection({subjectType:'vehicle',role:'reveal'}).cameraIntent,'controlled-reveal');
assert.equal(buildShotDirection({subjectType:'vehicle',role:'hook'}).cameraIntent,'immediate-attention');
assert.equal(buildShotDirection({subjectType:'vehicle',role:'hero-ending'}).cameraIntent,'hold-and-settle');
console.log('director-role-v2: PASS');
