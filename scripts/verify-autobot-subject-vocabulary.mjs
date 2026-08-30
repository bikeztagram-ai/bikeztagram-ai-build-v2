import assert from 'node:assert/strict';
import { classifyMediaSubject } from '../src/director.js';

assert.equal(classifyMediaSubject({ name: 'red scooter riding video' }), 'vehicle');
assert.equal(classifyMediaSubject({ name: 'off-road ATV trail footage' }), 'vehicle');
assert.equal(classifyMediaSubject({ name: 'moped parked outside' }), 'vehicle');
console.log('autobot-subject-vocabulary: PASS');
