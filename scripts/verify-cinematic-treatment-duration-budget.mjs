import assert from 'node:assert/strict';
import { buildCinematicTreatments } from '../src/cinematicTreatment.js';

const makeMoments = count => Array.from({ length: count }, (_, index) => ({
  id: `shot-${index + 1}`,
  duration: 1,
  editorialRole: index === 0 ? 'hook' : index === count - 1 ? 'hero' : 'build'
}));

const fifteen = buildCinematicTreatments({ moments: makeMoments(3), targetDuration: 15 });
assert.equal(fifteen.items.length, 3);
assert.equal(fifteen.totalDuration, 15);
assert.deepEqual(fifteen.items.map(item => item.treatmentDuration), [5, 5, 5]);

const ten = buildCinematicTreatments({ moments: makeMoments(4), targetDuration: 10 });
assert.equal(ten.totalDuration, 10);
assert.ok(ten.items.every(item => item.treatmentDuration >= 0.5 && item.treatmentDuration <= 6));

const sixty = buildCinematicTreatments({ moments: makeMoments(10), targetDuration: 60 });
assert.equal(sixty.totalDuration, 60);
assert.ok(sixty.items.every(item => item.treatmentDuration <= 6));

const short = buildCinematicTreatments({ moments: makeMoments(10), targetDuration: 3 });
assert.equal(short.totalDuration, 5);
assert.ok(short.items.every(item => item.treatmentDuration === 0.5));

console.log('cinematic-treatment-duration-budget: PASS');
