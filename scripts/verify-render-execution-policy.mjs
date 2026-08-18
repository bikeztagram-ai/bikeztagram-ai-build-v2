import assert from 'node:assert/strict';
import { assessRenderExecution } from '../src/renderExecutionPolicy.js';

const healthy = assessRenderExecution({
  cuts: [
    { startTime: 0, duration: 3, speed: 1 },
    { startTime: 4, duration: 4, speed: 1 },
    { startTime: 9, duration: 4, speed: 1 },
    { startTime: 14, duration: 4, speed: 1 },
  ],
}, 15, { sourceDuration: 20 });
assert.equal(healthy.ready, true);
assert.equal(healthy.cutCount, 4);
assert.equal(healthy.effectiveDurationAccountsForSpeed, true);

const shortPlan = assessRenderExecution({ cuts: [{ startTime: 0, duration: 2, speed: 1 }] }, 15, { sourceDuration: 20 });
assert.equal(shortPlan.ready, false);
assert.ok(shortPlan.errors.some((item) => item.includes('materially short')));

const fastPlan = assessRenderExecution({
  cuts: [{ startTime: 0, duration: 8, speed: 1.5 }, { startTime: 9, duration: 8, speed: 1.5 }],
}, 15, { sourceDuration: 20 });
assert.equal(fastPlan.ready, false);
assert.ok(fastPlan.plannedDuration < 12);
assert.ok(fastPlan.errors.some((item) => item.includes('materially short')));

const outOfBounds = assessRenderExecution({
  cuts: [{ startTime: 0, duration: 5 }, { startTime: 17, duration: 5 }],
}, 10, { sourceDuration: 20 });
assert.equal(outOfBounds.ready, false);
assert.equal(outOfBounds.outOfBoundsCutCount, 1);
assert.ok(outOfBounds.errors.some((item) => item.includes('exceed the verified source duration')));

const empty = assessRenderExecution({ cuts: [] }, 15);
assert.equal(empty.ready, false);
assert.ok(empty.errors.some((item) => item.includes('no cuts')));

const invalid = assessRenderExecution({ cuts: [{ startTime: -1, duration: 2 }, { startTime: 3, duration: 0 }] }, 5);
assert.equal(invalid.ready, false);
assert.ok(invalid.errors.some((item) => item.includes('invalid timing')));

console.log('render-execution-policy: PASS');
