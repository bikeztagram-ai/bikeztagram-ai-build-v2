import assert from 'node:assert/strict';
import { createGeneratedScene, validateGeneratedScene, mergeGeneratedScenes } from '../src/generatedMediaContract.js';

const woman = createGeneratedScene({
  id: 'generated-character-01',
  type: 'image',
  prompt: 'Original adult fictional woman, cinematic motorcycle fashion portrait, natural proportions, dramatic evening lighting',
  duration: 2.5,
  purpose: 'hero-character',
  aspect: '9:16'
});
assert.equal(woman.sourceType, 'generated');
assert.equal(woman.generatedMediaType, 'image');
assert.equal(validateGeneratedScene(woman).ready, true);
assert.equal(woman.generationStatus, 'planned');
assert.equal(woman.provider, null);

const bad = validateGeneratedScene({ sourceType: 'generated', generated: true, generatedMediaType: 'video', duration: 20 });
assert.equal(bad.ready, false);
assert.ok(bad.issues.some((issue) => /prompt/i.test(issue)));
assert.ok(bad.issues.some((issue) => /duration/i.test(issue)));

const merged = mergeGeneratedScenes([{ id: 'real-1', sourceType: 'uploaded', duration: 3 }], [woman]);
assert.equal(merged.length, 2);
assert.equal(merged[1].sourceType, 'generated');
assert.equal(merged[1].storyOrder, 2);

console.log('generated-media-contract: PASS');
