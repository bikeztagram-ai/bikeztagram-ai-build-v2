import assert from 'node:assert/strict';
import { chooseVisualStrategy, generationContract, shouldRejectFakeGeneration } from '../src/mediaGenerationPolicy.js';

assert.equal(chooseVisualStrategy({ prompt: 'create a futuristic city chase', canGenerateVideo: true }).mode, 'ai-video');
assert.equal(chooseVisualStrategy({ prompt: 'edit my motorcycle ride', hasUploadedMedia: true }).mode, 'edit-source');
assert.equal(generationContract({ sourceType: 'generated', sourceUrl: 'blob:test' }).valid, true);
assert.equal(shouldRejectFakeGeneration({ sourceType: 'generated' }), true);
console.log('media-generation-policy: PASS');
