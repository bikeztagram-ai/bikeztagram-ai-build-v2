import assert from 'node:assert/strict';
import { createInternalTimeline, validateInternalTimeline } from '../src/videoEngine.js';

const productionPlan = {
  title: 'Ninja reveal',
  colorGrade: 'dark-cinematic',
  creativeDirection: 'mystery to reveal to hero ending',
  scenes: [
    { sourceType: 'uploaded', sourceIndex: 4, mediaId: 'rear', duration: 2, purpose: 'hook', editorialRole: 'hook', motionStyle: 'pan-left', motionIntensity: 1.2, transition: 'fade-in', startTime: 8 },
    { sourceType: 'uploaded', sourceIndex: 1, mediaId: 'detail', duration: 2.5, purpose: 'reveal detail', editorialRole: 'reveal', motionStyle: 'slow-push', motionIntensity: .7, transition: 'hard-cut', beatIndex: 4, beatTime: 2.0, startTime: 2 },
    { sourceType: 'generated', sourceIndex: 0, duration: 3, purpose: 'hero ending', editorialRole: 'hero-ending', generationPrompt: 'original cinematic motorcycle hero environment', motionStyle: 'slow-pull', motionIntensity: .8, transition: 'fade-out' }
  ]
};

const timeline = createInternalTimeline(productionPlan, { duration: 7.5 });
const result = validateInternalTimeline(timeline);
assert.equal(result.valid, true, result.errors.join('; '));
assert.equal(timeline.version, 2);
assert.deepEqual(timeline.tracks[0].clips.map(c => c.editorialRole), ['hook', 'reveal', 'hero-ending']);
assert.deepEqual(timeline.tracks[0].clips.map(c => c.motion), ['pan-left', 'slow-push', 'slow-pull']);
assert.equal(timeline.tracks[0].clips[1].beatAnchor.beatIndex, 4);
assert.equal(timeline.tracks[0].clips[1].beatAnchor.beatTime, 2);
assert.equal(timeline.tracks[0].clips[0].sourceProvenance.mediaId, 'rear');
assert.equal(timeline.tracks[0].clips[2].sourceProvenance.generated, true);
assert.equal(timeline.editorialContract.rolesPreserved, true);
assert.equal(timeline.editorialContract.directorMotionPreserved, true);
assert.equal(timeline.editorialContract.sourceProvenancePreserved, true);
console.log('timeline-director-preservation: PASS');
