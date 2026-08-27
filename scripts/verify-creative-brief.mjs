import assert from 'node:assert/strict';
import { describeCreativeBrief, parseCreativeBrief } from '../src/creativeBrief.js';
import { createAIEditPlan } from '../src/aiEditPlanner.js';

const bikeBrief = parseCreativeBrief('Create a 15 second cinematic Instagram reel. Start with mystery, build anticipation, reveal the motorcycle, then accelerate into fast action and finish on a hero shot. Use restrained titles.');
assert.equal(bikeBrief.version, 'creative-brief-v1');
assert.equal(bikeBrief.targetDuration, 15);
assert.equal(bikeBrief.durationExplicit, true);
assert.equal(bikeBrief.aspectRatio, 'portrait');
assert.equal(bikeBrief.socialFirst, true);
assert.equal(bikeBrief.pacing, 'rapid');
assert.equal(bikeBrief.tone, 'cinematic');
assert.deepEqual(bikeBrief.storyArc, ['hook', 'build', 'reveal', 'action', 'hero']);
assert.ok(bikeBrief.priorities.includes('clear-reveal-payoff'));
assert.ok(bikeBrief.priorities.includes('restrained-text-overlays'));
assert.ok(bikeBrief.beatProfile.targetCuts >= 3);

const landscapeBrief = parseCreativeBrief('Make a 24 second horizontal YouTube film with a calm emotional pace.', { targetDuration: 15 });
assert.equal(landscapeBrief.targetDuration, 24);
assert.equal(landscapeBrief.durationExplicit, true);
assert.equal(landscapeBrief.aspectRatio, 'landscape');
assert.equal(landscapeBrief.pacing, 'slow');
assert.equal(landscapeBrief.tone, 'emotional');

const squareBrief = parseCreativeBrief('A clean square product showcase, around 10 seconds.', { targetDuration: 15 });
assert.equal(squareBrief.targetDuration, 10);
assert.equal(squareBrief.durationExplicit, true);
assert.equal(squareBrief.aspectRatio, 'square');
assert.equal(squareBrief.tone, 'minimal');

const defaultBrief = parseCreativeBrief('Make a premium cinematic motorcycle film.', { targetDuration: 15 });
assert.equal(defaultBrief.targetDuration, 15);
assert.equal(defaultBrief.durationExplicit, false);

const plannerProfile = createAIEditPlan(
  { durationInSeconds: 30, subject: { label: 'motorcycle' }, bestMoments: [] },
  { maxCuts: 8, targetDuration: 15, creativePrompt: 'Make a 24 second cinematic motorcycle film with a strong reveal.' },
);
assert.equal(plannerProfile.targetDuration, 24);
assert.equal(plannerProfile.briefProfile.targetDuration, 24);
assert.equal(plannerProfile.briefProfile.durationExplicit, true);
assert.ok(Array.isArray(plannerProfile.cuts));

assert.equal(describeCreativeBrief(bikeBrief), '15s 9:16 vertical • cinematic • rapid pacing • hook → build → reveal → action → hero');

console.log('Creative brief intent verification: PASS');
