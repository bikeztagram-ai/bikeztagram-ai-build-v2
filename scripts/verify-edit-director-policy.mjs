import assert from 'node:assert/strict';
import { shapeCinematicEditPlan } from '../src/editDirectorPolicy.js';

const moments = [
  { start: 0, end: 3, score: 0.70, cinematicScore: 0.60, motionScore: 0.30 },
  { start: 4, end: 8, score: 0.95, cinematicScore: 0.90, motionScore: 0.80 },
  { start: 9, end: 13, score: 0.82, cinematicScore: 0.85, motionScore: 0.60 },
  { start: 14, end: 18, score: 0.76, cinematicScore: 0.70, motionScore: 0.90 },
];

const input = {
  title: 'Night Ride',
  cuts: [
    { momentIndex: 0, startTime: 0, endTime: 2, duration: 2, purpose: 'mystery', transition: 'hard-cut', motionStyle: 'static', speed: 1, text: 'NINJA 1000SX' },
    { momentIndex: 1, startTime: 4, endTime: 6, duration: 2, purpose: 'build', transition: 'hard-cut', motionStyle: 'slow-push', speed: 1, text: 'repeat' },
    { momentIndex: 2, startTime: 9, endTime: 11, duration: 2, purpose: 'reveal', transition: 'crossfade', motionStyle: 'pan-left', speed: 1, text: 'repeat' },
    { momentIndex: 3, startTime: 14, endTime: 16, duration: 2, purpose: 'action', transition: 'whip-right', motionStyle: 'pan-right', speed: 1.2, text: 'repeat' },
  ],
};

const shaped = shapeCinematicEditPlan(input, moments);
assert.equal(shaped.cuts.length, 4);
assert.equal(shaped.cuts.at(-1).momentIndex, 1);
assert.equal(shaped.cuts[0].text, 'NINJA 1000SX');
assert.equal(shaped.cuts[1].text, '');
assert.equal(shaped.cuts.at(-1).purpose, 'hero');
assert.equal(shaped.editorialStructure.length, 4);
assert.ok(shaped.cuts.every((cut) => cut.momentIndex >= 0 && cut.momentIndex < moments.length));
assert.ok(shaped.cuts.every((cut) => cut.transition));
assert.ok(shaped.cuts.every((cut) => cut.motionStyle));
assert.ok(shaped.plannedDuration >= 7);

// Regression: Gemini can legally return a single verified cut. The director
// must use additional verified Stage 1 moments rather than rendering a
// one-shot ~2-second edit when the analysis contains enough evidence.
const sparse = shapeCinematicEditPlan({ cuts: [{ momentIndex: 2, startTime: 9, endTime: 11, duration: 2 }] }, moments);
assert.equal(sparse.cuts.length, 4);
assert.equal(sparse.cuts.at(-1).momentIndex, 1);
assert.ok(sparse.plannedDuration >= 7);
assert.ok(sparse.cuts.every((cut) => cut.startTime >= moments[cut.momentIndex].start));
assert.ok(sparse.cuts.every((cut) => cut.endTime <= moments[cut.momentIndex].end + 1e-9));

console.log('edit-director-policy: PASS');
