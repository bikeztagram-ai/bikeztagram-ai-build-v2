import assert from 'node:assert/strict';
import { assessRenderExecution } from '../src/renderExecutionPolicy.js';

const healthy = assessRenderExecution({
  cuts: [
    { startTime: 0, duration: 3 },
    { startTime: 4, duration: 4 },
    { startTime: 9, duration: 4 },
    { startTime: 14, duration: 3 },
  ],
}, 15);
assert.equal(healthy.ready, true);
assert.equal(healthy.cutCount, 4);

const shortPlan = assessRenderExecution({ cuts: [{ startTime: 0, duration: 2 }] }, 15);
assert.equal(shortPlan.ready, false);
assert.ok(shortPlan.errors.some((item) => item.includes('materially short')));

const empty = assessRenderExecution({ cuts: [] }, 15);
assert.equal(empty.ready, false);
assert.ok(empty.errors.some((item) => item.includes('no cuts')));

const invalid = assessRenderExecution({ cuts: [{ startTime: -1, duration: 2 }, { startTime: 3, duration: 0 }] }, 5);
assert.equal(invalid.ready, false);
assert.ok(invalid.errors.some((item) => item.includes('invalid timing')));

console.log('render-execution-policy: PASS');
