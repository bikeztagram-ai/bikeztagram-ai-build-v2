import assert from 'node:assert/strict';
import { buildShotMotion } from '../src/director.js';
assert.equal(buildShotMotion({subjectType:'vehicle',role:'action',cameraMotion:'orbit'}).type,'orbit');
console.log('director-override-v2: PASS');
