import assert from 'node:assert/strict';
import { buildBeatMap, nearestBeat, quantizeCutTimes, buildVisualBeatPlan } from '../src/audioBeatMap.js';

const map = buildBeatMap({ durationSeconds: 15, bpm: 120 });
assert.equal(map.beats[0].time, 0);
assert.equal(map.beats[0].accent, 'downbeat');
assert.equal(map.beatLength, 0.5);
assert.ok(map.beats.length >= 30);

const beat = nearestBeat(2.04, map);
assert.equal(beat.time, 2);

const cuts = quantizeCutTimes([
  { startTime: 0.04, purpose: 'real-opening' },
  { startTime: 2.08, purpose: 'real-action' },
  { startTime: 9.01, purpose: 'real-hero-ending' }
], map, 0.12);
assert.equal(cuts[0].startTime, 0);
assert.equal(cuts[1].startTime, 2);
assert.equal(cuts[2].startTime, 9);
assert.ok(cuts.every((cut) => cut.beatSync));

const visual = buildVisualBeatPlan(cuts, map);
assert.equal(visual[0].action, 'hook');
assert.equal(visual[1].action, 'impact');
assert.equal(visual[2].action, 'resolve');

console.log('audio-beat-map: PASS');
