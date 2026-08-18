import assert from 'node:assert/strict';
import { buildRenderFrameSchedule, frameAtTime, findScheduledCut } from '../src/renderFrameSchedule.js';

const schedule = buildRenderFrameSchedule({
  cuts: [
    { order: 0, duration: 2, storyRole: 'hook' },
    { order: 1, duration: 1.5, storyRole: 'hero' },
  ],
}, 30);

assert.equal(schedule.fps, 30);
assert.equal(schedule.cuts[0].startFrame, 0);
assert.equal(schedule.cuts[0].endFrame, 60);
assert.equal(schedule.cuts[1].startFrame, 60);
assert.equal(schedule.cuts[1].endFrame, 105);
assert.equal(schedule.totalFrames, 105);
assert.equal(schedule.durationSeconds, 3.5);

assert.equal(frameAtTime(0, 30), 0);
assert.equal(frameAtTime(1.99, 30), 59);
assert.equal(findScheduledCut(schedule, 60).storyRole, 'hero');
assert.equal(findScheduledCut(schedule, 105), null);

const fallback = buildRenderFrameSchedule({ cuts: [{ duration: 1 }] }, 0);
assert.equal(fallback.fps, 30);
assert.equal(fallback.totalFrames, 30);

console.log('render-frame-schedule: PASS');
