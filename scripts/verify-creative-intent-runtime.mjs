import assert from 'node:assert/strict';
import { compileCreativeIntent, intentToProviderPrompt } from '../src/creativeIntentCompiler.js';

const cases = [
  ['A fast cyberpunk motorcycle chase through a rainy neon city at night', 'cyberpunk', 'motorcycle', 'fast'],
  ['An emotional fantasy dragon reveal above a castle at sunset', 'fantasy', 'creature', 'slow'],
  ['FPV racing car pursuit on a desert track', 'racing', 'car', 'fast'],
  ['A terrifying zombie escape through a foggy abandoned city', 'horror', 'character', 'fast'],
];

for (const [prompt, world, subject, pace] of cases) {
  const intent = compileCreativeIntent(prompt, { duration: 15, shots: 6, seed: 42 });
  assert.equal(intent.type, 'creative-intent-graph');
  assert.equal(intent.brief.world, world);
  assert.equal(intent.brief.subject, subject);
  assert.equal(intent.brief.pace, pace);
  assert.equal(intent.shots.length, 6);
  assert.ok(intent.shots.every((shot) => shot.duration > 0));
  assert.ok(intent.shots.every((shot) => shot.generationPrompt.includes('Continuity')));
  assert.ok(intent.shots.every((shot) => shot.depthLayers.length >= 6));
  assert.ok(intentToProviderPrompt(intent, 0).length > 100);
}

console.log('Creative intent runtime: PASS');
