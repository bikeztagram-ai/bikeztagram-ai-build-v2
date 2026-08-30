import assert from 'node:assert/strict';
import { buildShotMotion } from '../src/director.js';
assert.equal(buildShotMotion({subjectType:'vehicle',role:'action'}).type,'tracking-push-pan');
assert.equal(buildShotMotion({subjectType:'person',role:'action'}).type,'orbit-push');
assert.equal(buildShotMotion({subjectType:'product',role:'hero-ending'}).type,'precision-push');
console.log('director-motion-v2: PASS');
