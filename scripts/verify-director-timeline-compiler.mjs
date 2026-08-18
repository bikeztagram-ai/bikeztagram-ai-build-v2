import assert from 'node:assert/strict';
import { compileDirectorTimeline } from '../src/directorTimelineCompiler.js';

const productionPlan = {
  title: 'Test Director',
  creativeRequest: 'cinematic action motorcycle edit',
  targetDuration: 15,
  sourceAnalysis: { durationSeconds: 13 },
  style: { action: true, dark: true },
  scenes: [
    { sourceType: 'uploaded', startTime: 0.5, duration: 2.5, purpose: 'real-opening', motionStyle: 'slow-push', motionIntensity: 0.6, speed: 0.92, speedEnd: 1 },
    { sourceType: 'uploaded', startTime: 4, duration: 2.5, purpose: 'real-action', motionStyle: 'pan-right', motionIntensity: 0.8, speed: 1.08, speedEnd: 1.18 },
    { sourceType: 'uploaded', startTime: 8, duration: 2.5, purpose: 'real-cinematic-beat', motionStyle: 'tilt-up', motionIntensity: 0.7, speed: 1, speedEnd: 1.1 },
    { sourceType: 'uploaded', startTime: 10.5, duration: 2.5, purpose: 'real-hero-ending', motionStyle: 'slow-pull', motionIntensity: 0.5, speed: 0.9, speedEnd: 0.82 }
  ]
};

const timeline = compileDirectorTimeline(productionPlan, { bpm: 120 });
assert.equal(timeline.cuts.length, 5);
assert.equal(timeline.cuts[0].transition, 'fade-in');
assert.equal(timeline.cuts.at(-1).purpose, 'real-hero-hold');
assert.equal(timeline.cuts.at(-1).holdLastFrame, true);
assert.equal(timeline.duration, 15);
assert.equal(timeline.targetDuration, 15);
assert.equal(timeline.cuts[1].transition, 'flash-cut');
assert.ok(timeline.cuts.every((cut) => cut.sourceType === 'uploaded'));
assert.ok(timeline.cuts.every((cut) => cut.audioSync && cut.beatTreatment));
assert.ok(timeline.cuts.some((cut) => cut.speedEnd > cut.speed));
assert.ok(timeline.cuts[3].speedEnd < timeline.cuts[3].speed);
assert.equal(timeline.audio.bpm, 120);
assert.equal(timeline.audio.policy.sourceTimingIsAuthoritative, true);
assert.equal(timeline.audio.policy.neverMoveSourceTimestampToAchieveBeatSync, true);

console.log('director-timeline-compiler: PASS');
