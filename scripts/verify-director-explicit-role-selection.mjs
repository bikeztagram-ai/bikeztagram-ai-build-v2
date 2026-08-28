import assert from 'node:assert/strict';
import { selectDirectorMoments } from '../src/directorSelection.js';

const moments = [
  { mediaIndex: 0, start: 0, duration: 2, description: 'ordinary road shot', role: 'hero', score: 6 },
  { mediaIndex: 1, start: 2, duration: 2, description: 'strong opening establishing frame', role: 'hook', score: 6 },
  { mediaIndex: 2, start: 4, duration: 2, description: 'rider accelerating', purpose: 'action', score: 6 },
  { mediaIndex: 3, start: 6, duration: 2, description: 'bike reveal profile', editorialRole: 'reveal', score: 6 },
  { mediaIndex: 4, start: 8, duration: 2, description: 'beautiful landscape', intent: 'hero-ending', score: 6 }
];

const result = selectDirectorMoments(moments, {
  maxCuts: 3,
  targetDuration: 8,
  creativePrompt: 'cinematic reveal with energetic action and a powerful ending'
});

assert.equal(result.length, 3);
assert.equal(result[0].editorialRole, 'hook');
assert.equal(result.at(-1).editorialRole, 'hero-ending');
assert.ok(result.some((shot) => shot.role === 'action' || shot.purpose === 'action'));
assert.ok(result.every((shot) => Number.isFinite(shot.directorSelectionScore)));

console.log('director-explicit-role-selection: PASS');
