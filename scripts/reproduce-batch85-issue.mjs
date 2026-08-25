import { alignCutsToMusic } from '../src/musicDirector.js';
import { buildSoundtrackBrief } from '../src/musicDirector.js';

const brief = buildSoundtrackBrief({duration: 15, bpm: 120, energy: 0.5});
const cuts = [
    {startTime: 0, duration: 2},
    {startTime: 2, duration: 4},
    {startTime: 6, duration: 5},
    {startTime: 11, duration: 4}
];

const aligned = alignCutsToMusic(cuts, brief);

console.log('Sections:', brief.sections);
console.log('Aligned Cuts:', aligned.map(c => ({startTime: c.startTime, duration: c.duration})));

// Check if they are actually aligned to the sections
// The sections start at 0, 2, 6, 11
// Currently, the duration is determined by snapTimeToBeat which only uses beats.
// Let's see if the cuts duration matches the sections.
// Section 1 (intro): 0-2 (duration 2) -> Cut 1 is 2
// Section 2 (build): 2-6 (duration 4) -> Cut 2 is 4
// Section 3 (main): 6-11 (duration 5) -> Cut 3 is 5
// Section 4 (finale): 11-15 (duration 4) -> Cut 4 is 4
// It seems the `alignCutsToMusic` might implicitly be aligned because of how I set up the test, but I should see if it actually *enforces* this based on sections.
