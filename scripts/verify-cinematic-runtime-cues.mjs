import { buildRenderCueTrack, sampleSpeedRamp, sourceTimeAtProgress, snapToBeat, validateRenderCueTrack } from '../src/cinematicRuntime.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ramp = sampleSpeedRamp({ progress: 0.5, speed: 0.5, speedEnd: 1.5 });
assert(Math.abs(ramp.rate - 1) < 0.001, 'speed ramp midpoint should be 1x');

const sourceMid = sourceTimeAtProgress({ sourceStart: 10, sourceDuration: 4, progress: 0.5, speed: 0.5, speedEnd: 1.5 });
assert(sourceMid > 11 && sourceMid < 13, 'speed-ramped source time should remain inside source range');

const beat = snapToBeat(4.04, [1, 2, 4, 6], 0.1);
assert(beat.snapped && beat.beatIndex === 2, 'nearby beat should be selected');

const timeline = {
  tracks: [{ type: 'video', clips: [
    { id: 'a', editorialRole: 'hook', sourceType: 'uploaded', start: 0, duration: 2, speed: 1, speedEnd: 1, motion: 'slow-push', transition: 'fade-in', colorGrade: 'dark-cinematic' },
    { id: 'b', editorialRole: 'hero-ending', sourceType: 'generated', start: 2, duration: 2.5, speed: 1, speedEnd: 0.75, motion: 'slow-pull', transition: 'fade-out', colorGrade: 'dark-cinematic', prompt: 'original cinematic mountain road' }
  ] }]
};
const cues = buildRenderCueTrack(timeline, [0, 2, 4.5]);
const validation = validateRenderCueTrack(cues);
assert(validation.valid, validation.errors.join('; '));
assert(cues.length === 2, 'two clips should produce two render cues');
assert(cues[1].generated === true, 'generated provenance should survive cue conversion');
assert(cues[1].speedEnd === 0.75, 'speed ramp decision should survive cue conversion');
assert(cues[0].beatSync.start.snapped === true, 'cue should preserve beat synchronization');

console.log('Cinematic runtime cue verification passed.');
