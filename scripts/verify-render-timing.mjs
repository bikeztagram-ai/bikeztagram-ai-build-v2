import assert from 'node:assert/strict';
import { normaliseCutTiming, buildRenderClock, renderCompletionThreshold } from '../src/renderTiming.js';

const timing = normaliseCutTiming({ startTime: 4, duration: 3, speed: 1.2, speedEnd: 1.4 }, 10);
assert.deepEqual(timing, { startTime: 4, duration: 3, speedStart: 1.2, speedEnd: 1.4 });

const clamped = normaliseCutTiming({ startTime: 99, duration: 20, speed: 9 }, 10);
assert.equal(clamped.startTime, 9.95);
assert.equal(clamped.duration, 0.5);
assert.equal(clamped.speedStart, 1.75);

const clock = buildRenderClock([{ duration: 2 }, { duration: 3.5 }, { duration: 1 }]);
assert.deepEqual(clock.map((item) => [item.start, item.end]), [[0, 2], [2, 5.5], [5.5, 6.5]]);

const threshold = renderCompletionThreshold([{ duration: 2 }, { duration: 3 }]);
assert.equal(threshold.expectedSeconds, 5);
assert.equal(threshold.minimumProgress, 0.995);

console.log('render-timing: PASS');
