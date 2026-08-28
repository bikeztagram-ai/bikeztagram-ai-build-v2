import assert from 'node:assert/strict';
import { buildCinematicTreatments } from '../src/cinematicTreatment.js';

const explicit = buildCinematicTreatments({
  creativePrompt: 'dark cinematic motorcycle trailer',
  targetDuration: 12,
  moments: [
    { id: 'hero-first', duration: 2, editorialRole: 'hero-ending', subjectType: 'vehicle' },
    { id: 'action', duration: 2, purpose: 'action', subjectType: 'vehicle' },
    { id: 'reveal', duration: 2, intent: 'reveal', subjectType: 'vehicle' },
    { id: 'hook-last', duration: 2, role: 'hook', subjectType: 'vehicle' }
  ]
});

assert.equal(explicit.items[0].editorialRole, 'hero-ending');
assert.equal(explicit.items[0].cinematicTreatment.intensity, 'resolution');
assert.equal(explicit.items[1].cinematicTreatment.intensity, 'high');
assert.equal(explicit.items[2].cinematicTreatment.intensity, 'rising');
assert.equal(explicit.items[3].cinematicTreatment.intensity, 'hook');

const single = buildCinematicTreatments({ moments: [{ id: 'only-shot', duration: 2 }] });
assert.equal(single.items[0].editorialRole, 'hero-ending');
assert.equal(single.items[0].cinematicTreatment.transition, 'fade');

const positional = buildCinematicTreatments({ moments: [{ id: 'first' }, { id: 'middle' }, { id: 'last' }] });
assert.equal(positional.items[0].editorialRole, 'hook');
assert.equal(positional.items[0].cinematicTreatment.intensity, 'hook');
assert.equal(positional.items[2].editorialRole, 'hero-ending');
assert.equal(positional.items[2].cinematicTreatment.intensity, 'resolution');

console.log('cinematic-treatment-role-contract: PASS');
