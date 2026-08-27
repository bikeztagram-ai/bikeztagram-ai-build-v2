import assert from 'node:assert/strict';
import { scoreEditorialCandidate } from '../src/editorialQuality.js';
import { selectDirectorMoments } from '../src/directorSelection.js';

const shots = [
  { mediaIndex: 0, startTime: 0, duration: 2, description: 'wide motorcycle road establishing shot', subjectRole: 'motorcycle', score: 90 },
  { mediaIndex: 0, startTime: 2.2, duration: 2, description: 'wide motorcycle road establishing shot', subjectRole: 'motorcycle', score: 89 },
  { mediaIndex: 0, startTime: 5, duration: 1.4, description: 'close-up motorcycle detail of controls', subjectRole: 'motorcycle', score: 82 },
  { mediaIndex: 1, startTime: 1, duration: 2, description: 'tracking motorcycle rider accelerating through corner', subjectRole: 'motorcycle', score: 86 },
  { mediaIndex: 1, startTime: 4, duration: 2.2, description: 'side profile motorcycle riding at speed', subjectRole: 'motorcycle', score: 84 },
  { mediaIndex: 2, startTime: 7, duration: 2.5, description: 'hero motorcycle sunset landscape reveal', subjectRole: 'motorcycle', score: 88 }
];

assert.ok(scoreEditorialCandidate(shots[0], { role: 'hook' }) > 0, 'hook candidate should receive editorial credit');
assert.ok(scoreEditorialCandidate(shots[2], { role: 'build', chosen: [shots[0]], targetDuration: 12, usedDuration: 2 }) > 0, 'visually different follow-up should receive editorial credit');

const plan = selectDirectorMoments(shots, { maxCuts: 5, targetDuration: 10, creativePrompt: 'dark cinematic motorcycle action reveal' });
assert.equal(plan.length, 5, 'selector should honour requested maximum when enough moments exist');
assert.equal(plan[0].editorialRole, 'hook', 'first selected moment should be marked as hook');
assert.equal(plan.at(-1).editorialRole, 'hero-ending', 'last selected moment should be marked as hero ending');
assert.ok(new Set(plan.map((shot) => shot.directorShotFamily)).size >= 3, 'selection should preserve at least three shot families');
assert.ok(plan.every((shot) => Number.isFinite(shot.directorSelectionScore)), 'selected shots should expose deterministic selection scores');

console.log('editorial-quality-selection: PASS');
