import assert from 'node:assert/strict';
import { createTimeline, validateTimeline, toLegacyEditPlan } from '../src/timelineModel.js';

const timeline = createTimeline({
  duration: 4,
  tracks: {
    video: [{ id: 'shot-1', start: 0, duration: 3, trimIn: 1, trimOut: 4 }],
    audio: [{ id: 'music-1', start: 0, duration: 4 }],
  },
});

assert.equal(timeline.version, 1);
assert.equal(timeline.duration, 4);
assert.equal(timeline.tracks.video[0].end, 3);
assert.equal(timeline.tracks.video[0].locked, false);
assert.equal(validateTimeline(timeline).valid, true);

const invalid = createTimeline({ tracks: { video: [{ id: 'bad', start: -1, duration: 2 }] } });
assert.equal(validateTimeline(invalid).valid, false);

const legacy = toLegacyEditPlan(timeline);
assert.equal(legacy.tracks.video[0].id, 'shot-1');
assert.equal(legacy.tracks.video[0].end, undefined);

console.log('timeline-model: PASS');
