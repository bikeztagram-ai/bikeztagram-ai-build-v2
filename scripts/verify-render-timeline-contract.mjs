import assert from 'node:assert/strict';
import { compileRenderTimeline, isRenderTimelineReady } from '../src/renderTimelineContract.js';

const timeline = compileRenderTimeline({
  sourceDuration: 20,
  targetDuration: 15,
  bpm: 120,
  scenes: [
    { id: 'a', sourceType: 'uploaded', startTime: 0, duration: 2.5, purpose: 'real-opening', speed: 0.8, speedEnd: 1.0 },
    { id: 'b', sourceType: 'uploaded', startTime: 5, duration: 2.5, purpose: 'real-action', speed: 1.0, speedEnd: 1.35 },
    { id: 'c', sourceType: 'uploaded', startTime: 12, duration: 2.5, purpose: 'real-hero-ending', speed: 1.0, speedEnd: 0.7 },
    { id: 'generated', sourceType: 'generated', startTime: 0, duration: 3, purpose: 'generated-fill' }
  ]
});

assert.equal(timeline.scenes.length, 3);
assert.equal(timeline.scenes[0].visualRole, 'hook');
assert.equal(timeline.scenes[1].visualRole, 'impact');
assert.equal(timeline.scenes[2].visualRole, 'resolve');
assert.ok(timeline.beatMap.beats.length > 0);
assert.ok(timeline.scenes.every((scene) => scene.sourceConsumption <= timeline.sourceDuration));
assert.equal(timeline.policies.realFootageFirst, true);
assert.equal(timeline.policies.generatedScenesExcludedUntilGenerationAdapterReady, true);
assert.equal(isRenderTimelineReady(timeline).ready, true);

const invalid = compileRenderTimeline({
  sourceDuration: 4,
  targetDuration: 5,
  scenes: [{ sourceType: 'uploaded', startTime: 3.8, duration: 2, speed: 1.5 }]
});
assert.equal(isRenderTimelineReady(invalid).ready, false);

console.log('render-timeline-contract: PASS');
