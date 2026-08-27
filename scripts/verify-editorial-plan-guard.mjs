import assert from 'node:assert/strict';
import { assertExecutablePlan, validateExecutablePlan } from '../src/editorialPlanGuard.js';

const media = [{ id: 'source-0', type: 'video/mp4' }, { id: 'source-1', type: 'image/jpeg' }];

const valid = {
  targetDuration: 6,
  cuts: [
    { mediaId: 'source-0', duration: 2, purpose: 'hook' },
    { mediaIndex: 1, duration: 2, purpose: 'build' },
    { sourceType: 'generated', generationPrompt: 'Original atmospheric city insert', duration: 2 }
  ]
};

const validResult = validateExecutablePlan(valid, media);
assert.equal(validResult.valid, true);
assert.equal(validResult.cutCount, 3);
assert.equal(validResult.totalDuration, 6);
assert.doesNotThrow(() => assertExecutablePlan(valid, media));

const missingMedia = validateExecutablePlan({ cuts: [{ mediaIndex: 9, duration: 2 }] }, media);
assert.equal(missingMedia.valid, false);
assert.match(missingMedia.errors.join(' '), /no valid media reference/);

const missingPrompt = validateExecutablePlan({ cuts: [{ sourceType: 'generated', duration: 2 }] }, media);
assert.equal(missingPrompt.valid, false);
assert.match(missingPrompt.errors.join(' '), /no generation prompt/);

const oversized = validateExecutablePlan({ targetDuration: 4, cuts: [{ mediaIndex: 0, duration: 6 }] }, media);
assert.equal(oversized.valid, false);
assert.match(oversized.errors.join(' '), /exceeds target/);

assert.throws(() => assertExecutablePlan({ cuts: [{ mediaIndex: 99, duration: 2 }] }, media), /Editorial plan validation failed/);

console.log('editorial-plan-guard: PASS');
