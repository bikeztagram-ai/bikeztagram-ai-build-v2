import assert from 'node:assert/strict';
import { buildRenderExecutionPlan } from '../src/renderExecutionPlan.js';
import { routeRenderExecution } from '../src/renderExecutionRouter.js';
import { buildRenderRecordingPlan } from '../src/renderRecordingPlan.js';
import { buildStableRendererInput } from '../src/renderRecordingAdapter.js';

const mediaItems = [
  { id: 'video-0', type: 'video/mp4', url: 'blob:test-video', sourceUrl: 'blob:test-video' },
];

const timeline = {
  targetDuration: 4,
  cuts: [{
    mediaIndex: 0,
    startTime: 1.2,
    duration: 4,
    storyRole: 'action',
    purpose: 'action',
    motionStyle: 'slow-push',
    motionIntensity: 0.8,
    speed: 1.1,
    speedEnd: 1.3,
    transition: 'flash-cut',
    colorGrade: 'dark-cinematic',
    text: 'NINJA 1000SX',
  }],
};

const execution = buildRenderExecutionPlan({
  cuts: timeline.cuts,
  mediaItems,
  targetDuration: timeline.targetDuration,
});
assert.equal(execution.ready, true);

const routed = routeRenderExecution(execution);
assert.equal(routed.ready, true);
assert.equal(routed.mode, 'stable-video');

const recording = buildRenderRecordingPlan(routed, 30);
assert.equal(recording.ready, true);
assert.equal(recording.totalFrames, 120);
assert.equal(recording.cuts[0].startFrame, 0);
assert.equal(recording.cuts[0].endFrame, 120);
assert.equal(recording.cuts[0].motionStyle, 'slow-push');
assert.equal(recording.cuts[0].speedEnd, 1.3);
assert.equal(recording.cuts[0].transition, 'flash-cut');

const stable = buildStableRendererInput(recording, mediaItems);
assert.equal(stable.ready, true);
assert.equal(stable.mediaItems, mediaItems);
assert.equal(stable.plan.cuts[0].mediaIndex, 0);
assert.equal(stable.plan.cuts[0].motionStyle, 'slow-push');
assert.equal(stable.plan.cuts[0].speedEnd, 1.3);
assert.equal(stable.plan.cuts[0].transition, 'flash-cut');
assert.equal(stable.plan.cuts[0].text, 'NINJA 1000SX');

const missing = buildStableRendererInput(recording, [{ id: 'other', url: 'blob:other' }]);
assert.equal(missing.ready, false);

console.log('render-recording-integration: PASS');
