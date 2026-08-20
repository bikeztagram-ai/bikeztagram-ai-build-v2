import assert from 'node:assert/strict';
import { applyAudioBeatSyncToPlan } from '../src/renderAudioBridge.js';
import { buildRhythmReplacementMap } from '../src/musicReplacementGuide.js';

const plan = {
  targetDuration: 8,
  music: {
    duration: 8,
    beatGrid: { beats: Array.from({ length: 9 }, (_, index) => ({ index, time: index, bar: Math.floor(index / 4) + 1, beat: index % 4 + 1, downbeat: index % 4 === 0 })) }
  },
  cuts: [
    { mediaIndex: 0, startTime: 7.25, duration: 1.4, purpose: 'hook', speed: 1 },
    { mediaIndex: 1, startTime: 12.5, duration: 1.8, purpose: 'hero', speed: 1.1 }
  ]
};

const synced = applyAudioBeatSyncToPlan(plan);
assert.equal(synced.enabled, true);
assert.equal(synced.plan.cuts[0].startTime, 7.25);
assert.equal(synced.plan.cuts[1].startTime, 12.5);
assert.equal(synced.plan.cuts[0].sourceStartTime, 7.25);
assert.equal(synced.plan.cuts[1].sourceStartTime, 12.5);
assert.equal(synced.plan.musicTimeline.sourceOffsetsPreserved, true);
assert.equal(synced.plan.cuts[0].timelineStartTime, 0);
assert.equal(synced.plan.cuts[0].timelineEndTime, 1);
assert.equal(synced.plan.cuts[1].timelineStartTime, 1);
assert.equal(synced.plan.cuts[1].timelineEndTime, 3);

const replacement = buildRhythmReplacementMap(synced.plan, plan.music);
assert.equal(replacement.sourceOffsetsPreserved, true);
assert.equal(replacement.editCuts[0].start, 0);
assert.equal(replacement.editCuts[0].sourceStart, 7.25);
assert.equal(replacement.editCuts[1].start, 1);
assert.equal(replacement.editCuts[1].sourceStart, 12.5);
assert.equal(replacement.editCuts[0].beatAligned, true);

console.log('batch36-beat-sync-source-offsets: PASS');
