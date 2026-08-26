import assert from 'node:assert/strict';
import { selectDirectorMoments } from '../src/directorSelection.js';

const sourceOrder = [
  { mediaIndex: 0, startTime: 0, description: 'hero motorcycle at sunset', shotType: 'wide', score: 98 },
  { mediaIndex: 1, startTime: 1, description: 'wide road establishing motorcycle', shotType: 'wide', score: 90 },
  { mediaIndex: 2, startTime: 2, description: 'close-up detail of motorcycle tank', shotType: 'detail', score: 88 },
  { mediaIndex: 3, startTime: 3, description: 'fast motorcycle cornering action', shotType: 'action', score: 92 },
  { mediaIndex: 4, startTime: 4, description: 'hero portrait motorcycle reveal', shotType: 'portrait', score: 94 },
];

const selected = selectDirectorMoments(sourceOrder, { maxCuts: 5, creativePrompt: 'dark cinematic motorcycle reveal with action' });
assert.equal(selected[0].directorStoryRole, 'hook');
assert.equal(selected.at(-1).directorStoryRole, 'hero');
assert.deepEqual(selected.map((m) => m.directorStoryPosition), [0, 1, 2, 3, 4]);
console.log('director-story-order-regression: PASS');
