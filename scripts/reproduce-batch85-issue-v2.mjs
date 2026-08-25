import { alignCutsToMusic } from '../src/musicDirector.js';
import { buildSoundtrackBrief } from '../src/musicDirector.js';

const brief = buildSoundtrackBrief({duration: 15, bpm: 120, energy: 0.5});
const cuts = [
    {startTime: 0, duration: 1.5}, // Should snap to beat grid, but does it snap to section?
    {startTime: 1.5, duration: 3},
    {startTime: 4.5, duration: 6},
    {startTime: 10.5, duration: 4.5}
];

const aligned = alignCutsToMusic(cuts, brief);

console.log('Sections:', brief.sections);
console.log('Aligned Cuts:', aligned.map(c => ({startTime: c.startTime, duration: c.duration})));
// The sections are: intro(0-2), build(2-6), main(6-11), finale(11-15)
// The cuts I provided do not align to these sections.
// Aligned cuts should ideally be adjusted to respect these section boundaries if we want to integrate them.
