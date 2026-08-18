import assert from 'node:assert/strict';
import { buildAudioAwareTimeline, buildBeatDrivenTreatment } from '../src/audioDirectorSync.js';

const result = buildAudioAwareTimeline([
  { startTime: 4.2, duration: 2.4, purpose: 'real-opening' },
  { startTime: 9.5, duration: 2.2, purpose: 'real-action' },
  { startTime: 16.2, duration: 2.1, purpose: 'real-hero-ending' }
], { durationSeconds: 15, bpm: 120, snapToleranceSeconds: 0.15 });

assert.equal(result.bpm, 120);
assert.equal(result.cuts.length, 3);
assert.equal(result.cuts[0].audioSync.role, 'hook');
assert.equal(result.cuts[1].audioSync.role, 'impact');
assert.equal(result.cuts[2].audioSync.role, 'resolve');
assert.equal(result.policy.sourceTimingIsAuthoritative, true);
assert.equal(result.policy.neverMoveSourceTimestampToAchieveBeatSync, true);

const treatment = buildBeatDrivenTreatment(result.cuts[1], 1, 3);
assert.equal(treatment.speedBias, 'accelerate-into-beat');
assert.equal(treatment.transitionBias, 'impact-cut');
assert.equal(treatment.holdAfterBeat, true);

console.log('audio-director-sync: PASS');
