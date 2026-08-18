import assert from 'node:assert/strict';
import { compilePlatformTimeline, assertPlatformTimelineParity } from '../src/platformTimelineCompiler.js';

const master = {
  version: '1.4', title: 'Test reel', targetDuration: 15, duration: 15,
  cuts: [
    { mediaIndex: 0, mediaId: 'a', startTime: 2.2, duration: 3, storyRole: 'hook', storyOrder: 1, motionStyle: 'slow-push', speed: 1, speedEnd: 1.05, transition: 'fade-in', audioSync: { beatIndex: 0 } },
    { mediaIndex: 1, mediaId: 'b', startTime: 7.1, duration: 4, storyRole: 'escalation', storyOrder: 2, motionStyle: 'pan-right', speed: 1.05, speedEnd: 1.2, transition: 'flash-cut', audioSync: { beatIndex: 10 } },
    { mediaIndex: 0, mediaId: 'a', startTime: 12, duration: 3, storyRole: 'hero', storyOrder: 3, motionStyle: 'slow-pull', speed: 0.9, speedEnd: 0.75, transition: 'fade-out', audioSync: { beatIndex: 18 } }
  ]
};

const analysis = { subject: { focalPoint: { x: 0.62, y: 0.48 }, description: 'motorcycle' } };
const variants = compilePlatformTimeline(master, analysis);
assert.equal(variants.platforms.length, 5);
assert.equal(assertPlatformTimelineParity(master, variants), true);

for (const platform of variants.platforms) {
  assert.equal(platform.cuts.length, master.cuts.length);
  assert.deepEqual(platform.cuts.map((c) => c.startTime), master.cuts.map((c) => c.startTime));
  assert.deepEqual(platform.cuts.map((c) => c.duration), master.cuts.map((c) => c.duration));
  assert.deepEqual(platform.cuts.map((c) => c.storyRole), master.cuts.map((c) => c.storyRole));
  assert.ok(platform.cuts.every((c) => c.platformFraming.safeArea.keepSubjectVisible));
}

console.log('platform-timeline-compiler: PASS');
