import assert from 'node:assert/strict';
import { normalizeCreativeBrief } from '../src/creativeBriefModel.js';
import { compileCreativeIntent } from '../src/creativeIntentCompiler.js';
import { generationContract, chooseVisualStrategy } from '../src/mediaGenerationPolicy.js';

const prompts = [
  'Create a cyberpunk chase through a rain-soaked city at night, FPV camera, fast pace, neon lighting.',
  'Create a romantic fantasy castle scene at sunrise with a slow aerial reveal.',
  'Make a documentary-style desert expedition with a truck driving through dust.'
];
for (const prompt of prompts) {
  const brief = normalizeCreativeBrief(prompt);
  assert.ok(brief.subject && brief.setting && brief.style && brief.camera);
  const intent = compileCreativeIntent(prompt, { duration: 15, aspectRatio: 'portrait' });
  assert.equal(intent.type, 'creative-intent-graph');
  assert.ok(intent.shots.length >= 3);
  assert.ok(intent.shots.every((shot) => shot.generationPrompt.includes(prompt)));
}
assert.equal(generationContract({ sourceType: 'generated', sourceUrl: 'blob:test' }).valid, true);
assert.equal(generationContract({ sourceType: 'generated' }).valid, false);
assert.equal(chooseVisualStrategy({ prompt: 'generate a dragon flying over a castle', canGenerateVideo: true }).mode, 'ai-video');
assert.equal(chooseVisualStrategy({ prompt: 'edit these photos', hasUploadedMedia: true }).mode, 'edit-source');
console.log('Universal creative runtime v2 verification passed.');
