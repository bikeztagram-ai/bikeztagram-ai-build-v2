import assert from 'node:assert/strict';
import { buildBeatMap } from '../src/audioBeatMap.js';
import { refineCinematicTimeline, timelineSummary } from '../src/timelineDirector.js';

const beatMap = buildBeatMap({ durationSeconds: 15, bpm: 120 });
const cuts = [
  { id: 'scene-01', purpose: 'real-opening', duration: 2.5, startTime: 0, mediaIndex: 0, motionStyle: 'slow-push', speed: 0.95 },
  { id: 'scene-02', purpose: 'real-cinematic-beat', duration: 2.5, startTime: 2.5, mediaIndex: 0, motionStyle: 'pan-right', speed: 1 },
  { id: 'scene-03', purpose: 'real-action', duration: 2.5, startTime: 5, mediaIndex: 0, motionStyle: 'pan-left', speed: 1.1 },
  { id: 'scene-04', purpose: 'real-cinematic-beat', duration: 2.5, startTime: 7.5, mediaIndex: 0, motionStyle: 'tilt-up', speed: 1 },
  { id: 'scene-05', purpose: 'real-hero-ending', duration: 2.5, startTime: 10, mediaIndex: 0, motionStyle: 'slow-pull', speed: 0.9 }
];

const refined = refineCinematicTimeline(cuts, {
  creativePrompt: 'cinematic motorcycle action trailer',
  beatMap
});

assert.equal(refined.length, 5);
assert.equal(refined[0].storyRole, 'hook');
assert.equal(refined[2].storyRole, 'escalation');
assert.equal(refined[4].storyRole, 'hero');
assert.ok(refined[2].motionIntensity >= 1.05);
assert.ok(refined[2].speed >= 1.12);
assert.equal(refined[2].beatSync.syncMode, 'impact-target');
assert.equal(refined[4].beatSync.syncMode, 'resolve-target');
assert.equal(refined[0].beatSync.action, 'hook');
assert.ok(refined.every((cut) => cut.coverage?.preserveSubject === true));

const summary = timelineSummary(refined);
assert.equal(summary.cuts, 5);
assert.ok(summary.storyScore >= 80);

console.log('director-timeline-integration: PASS');
