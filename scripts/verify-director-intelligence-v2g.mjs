import assert from 'node:assert/strict';
import { classifyMediaSubject } from '../src/director.js';
assert.equal(classifyMediaSubject({name:'red scooter riding'}),'vehicle');
assert.equal(classifyMediaSubject({name:'ATV quad trail'}),'vehicle');
assert.equal(classifyMediaSubject({name:'moped parked'}),'vehicle');
console.log('director-subject-v2: PASS');
