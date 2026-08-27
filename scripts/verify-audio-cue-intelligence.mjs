import { createBeatGrid, getMusicCueMarkers } from '../src/musicProvider.js';

const grid = createBeatGrid(4, 120, 1);
if (grid.length !== 8) throw new Error(`Expected 8 beats, received ${grid.length}`);
if (grid[0].time !== 0 || grid[1].time !== 0.5) throw new Error('Beat grid timing is not deterministic');
if (!grid[0].beat || grid[1].beat) throw new Error('Beat markers are incorrect');

const markers = getMusicCueMarkers([1, 1, 1, 1], 120);
if (markers.length !== 4) throw new Error('Expected one cue marker per shot');
if (markers.some((marker) => marker.beatDistance > 0.5)) throw new Error('Cue marker is too far from nearest beat');
if (createBeatGrid(-1, 120).length !== 0) throw new Error('Invalid duration was accepted');
if (createBeatGrid(4, 0).length !== 0) throw new Error('Invalid BPM was accepted');

console.log('audio-cue-intelligence: PASS');
