import assert from 'node:assert/strict';
import { compileDirectorTimeline } from '../src/directorTimelineCompiler.js';
import { buildAudioAwareTimeline } from '../src/audioDirectorSync.js';

const productionPlan = {
  title: 'Integration Test',
  creativeRequest: 'dark cinematic motorcycle action trailer',
  targetDuration: 15,
  sourceAnalysis: { durationSeconds: 12 },
  style: { dark: true },
  scenes: [
    { id: '1', sourceType: 'uploaded', purpose: 'real-opening', startTime: 0, duration: 2.5, motionStyle: 'slow-push', motionIntensity: .5, speed: .92, speedEnd: 1 },
    { id: '2', sourceType: 'uploaded', purpose: 'real-cinematic-beat', startTime: 2.4, duration: 2.5, motionStyle: 'pan-right', motionIntensity: .7, speed: 1, speedEnd: 1.08 },
    { id: '3', sourceType: 'uploaded', purpose: 'real-action', startTime: 5, duration: 2.5, motionStyle: 'pan-left', motionIntensity: 1, speed: 1.12, speedEnd: 1.2 },
    { id: '4', sourceType: 'uploaded', purpose: 'real-cinematic-beat', startTime: 7.6, duration: 2.5, motionStyle: 'tilt-up', motionIntensity: .7, speed: 1, speedEnd: 1.05 },
    { id: '5', sourceType: 'uploaded', purpose: 'real-hero-ending', startTime: 9.8, duration: 2.5, motionStyle: 'slow-pull', motionIntensity: .5, speed: .9, speedEnd: .8 }
  ]
};

const timeline = compileDirectorTimeline(productionPlan, { bpm: 120 });
assert.equal(timeline.cuts[0].storyRole, 'hook');
assert.equal(timeline.cuts.at(-1).storyRole, 'hero');
assert.ok(timeline.cuts.some((cut) => cut.storyRole === 'escalation'));
assert.ok(timeline.cuts.every((cut) => cut.sourceType === 'uploaded'));
assert.ok(timeline.cuts.every((cut) => cut.audioSync));
assert.ok(timeline.cuts.every((cut) => cut.beatTreatment));
assert.ok(timeline.story.coherence.score >= 80);

const audio = buildAudioAwareTimeline([
  { duration: 2.01 }, { duration: 2.01 }, { duration: 2.01 }
], { durationSeconds: 7, bpm: 120, snapToleranceSeconds: .2 });
for (let i = 1; i < audio.cuts.length; i += 1) {
  assert.equal(audio.cuts[i].audioSync.timelineStart, audio.cuts[i - 1].audioSync.timelineEnd);
}

console.log('director-integration: PASS');
