import assert from 'node:assert/strict';
import { buildCinematicTreatments } from '../src/cinematicTreatment.js';

const sameSubject = buildCinematicTreatments({
  creativePrompt: 'cinematic motorcycle trailer',
  targetDuration: 10,
  moments: [
    { id: 'hook', editorialRole: 'hook', subjectType: 'vehicle', duration: 2 },
    { id: 'action', editorialRole: 'action', subjectType: 'vehicle', duration: 3 },
    { id: 'hero', editorialRole: 'hero', subjectType: 'vehicle', duration: 3 }
  ]
});

assert.equal(sameSubject.items.length, 3);
assert.equal(sameSubject.items[1].cinematicTreatment.continuity, 'continue-action');
assert.equal(sameSubject.items[2].cinematicTreatment.continuity, 'hold-subject');
assert.equal(sameSubject.items[2].cinematicTreatment.transition, 'soft-fade');
assert.ok(sameSubject.totalDuration <= 10);

const changedSubject = buildCinematicTreatments({
  creativePrompt: 'cinematic journey',
  targetDuration: 8,
  moments: [
    { id: 'hook', editorialRole: 'hook', subjectType: 'vehicle', duration: 2 },
    { id: 'context', editorialRole: 'variation', subjectType: 'landscape', duration: 2 },
    { id: 'hero', editorialRole: 'hero', subjectType: 'vehicle', duration: 2 }
  ]
});

assert.equal(changedSubject.items[1].cinematicTreatment.continuity, 'bridge-context');
assert.equal(changedSubject.items[1].cinematicTreatment.transition, 'bridge-cut');
assert.equal(changedSubject.items[2].cinematicTreatment.continuity, 'reorient');

const empty = buildCinematicTreatments({ moments: [], targetDuration: 12 });
assert.deepEqual(empty.items, []);
assert.equal(empty.targetDuration, 12);

console.log('cinematic-continuity: PASS');
