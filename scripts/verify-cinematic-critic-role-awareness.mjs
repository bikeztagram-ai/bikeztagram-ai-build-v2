import assert from 'node:assert/strict';
import { critiqueAndImproveTimeline } from '../src/editCritic.js';

const strongPlan = [
  { mediaIndex: 0, startTime: 0, duration: 2, purpose: 'hook', motionStyle: 'slow-push', transition: 'fade-in' },
  { mediaIndex: 1, startTime: 2.5, duration: 2.5, purpose: 'build', motionStyle: 'pan-right', transition: 'crossfade' },
  { mediaIndex: 2, startTime: 5.5, duration: 2.5, purpose: 'action', motionStyle: 'slow-push', transition: 'whip-right' },
  { mediaIndex: 3, startTime: 8.5, duration: 2, purpose: 'hero-ending', motionStyle: 'slow-pull', transition: 'fade-out' },
];

const result = critiqueAndImproveTimeline(strongPlan, { flags: { action: true } });
assert.equal(result.before.issues.includes('Opening is not a strong hook'), false);
assert.equal(result.before.issues.includes('Ending lacks a clear resolution'), false);
assert.ok(result.before.score >= 90, `expected role-aware strong plan to score >=90, got ${result.before.score}`);
assert.equal(result.changed, false);

const editorialRoles = strongPlan.map((cut) => ({ ...cut, purpose: undefined, editorialRole: cut.purpose }));
const editorialResult = critiqueAndImproveTimeline(editorialRoles, { flags: { action: true } });
assert.equal(editorialResult.before.issues.includes('Opening is not a strong hook'), false);
assert.equal(editorialResult.before.issues.includes('Ending lacks a clear resolution'), false);

const weakPlan = strongPlan.map((cut) => ({ ...cut, role: undefined, purpose: undefined, editorialRole: undefined, motionStyle: 'static', transition: 'hard-cut' }));
const repaired = critiqueAndImproveTimeline(weakPlan, { flags: { action: true } });
assert.equal(repaired.changed, true);
assert.equal(repaired.cuts[0].role, 'hook');
assert.equal(repaired.cuts.at(-1).role, 'hero-ending');
assert.ok(repaired.after.score > repaired.before.score, `expected repair to improve score ${repaired.before.score} -> ${repaired.after.score}`);

console.log('cinematic-critic-role-awareness: PASS');
