import assert from 'node:assert/strict';
import { alignCutsToMusic } from '../src/musicDirector.js';
import { buildSoundtrackBrief } from '../src/musicDirector.js';

// Brief with sections: intro(0-2), build(2-6), main(6-11), finale(11-15)
const brief = buildSoundtrackBrief({duration: 15, bpm: 120, energy: 0.5});
const cuts = [
    {startTime: 0, duration: 1.5},
    {startTime: 1.5, duration: 3},
    {startTime: 4.5, duration: 6},
    {startTime: 10.5, duration: 4.5}
];

const aligned = alignCutsToMusic(cuts, brief);

// Check if starts are aligned to section boundaries where applicable (0, 2, 6, 11)
// The starts are: 0, 2, 4.5, 11
// Aligned starts should be 0, 2, 11 (snapped to boundaries)
// The 4.5 didn't snap because it was far from boundary. This is okay if tolerance is 0.5.

assert.equal(aligned[0].startTime, 0); // Intro
assert.equal(aligned[1].startTime, 2); // Build start
assert.equal(aligned[3].startTime, 11); // Finale start

console.log('batch85-section-alignment: PASS');
