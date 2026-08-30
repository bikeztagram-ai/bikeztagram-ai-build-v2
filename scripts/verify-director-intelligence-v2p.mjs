import assert from 'node:assert/strict';
import { classifyMediaSubject } from '../src/director.js';
assert.equal(classifyMediaSubject({name:'motorcycle rider'}),'vehicle');
assert.equal(classifyMediaSubject({name:'mountain sunset'}),'landscape');
assert.equal(classifyMediaSubject({name:'person portrait'}),'person');
console.log('director-classification-v2: PASS');
