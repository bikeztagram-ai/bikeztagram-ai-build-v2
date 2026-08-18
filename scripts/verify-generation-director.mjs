import assert from 'node:assert/strict';
import { buildCharacterRequest, buildGenerationRequest } from '../src/generationDirector.js';

const character = buildCharacterRequest({
  name: 'Maya',
  description: 'An adult fictional woman, 28 years old, dark hair and confident expression.',
  adultConfirmed: true,
  wardrobe: 'black leather motorcycle jacket',
  environment: 'empty mountain road at blue hour',
  continuityId: 'char-maya-001',
});

assert.equal(character.providerNeutral, true);
assert.equal(character.originalOnly, true);
assert.equal(character.requiresExternalProvider, true);
assert.equal(character.character.continuityId, 'char-maya-001');
assert.match(character.prompt, /original fictional scene/i);
assert.match(character.prompt, /real identifiable person/i);

const bikeScene = buildGenerationRequest({
  subject: 'motorcycle',
  description: 'A blue sports motorcycle parked beside a mountain overlook.',
  style: 'cinematic commercial photography',
  durationSeconds: 5,
});
assert.equal(bikeScene.subject, 'motorcycle');
assert.equal(bikeScene.durationSeconds, 5);
assert.equal(bikeScene.readyForProvider, true);

assert.throws(
  () => buildGenerationRequest({ subject: 'woman', description: 'A beautiful woman in a jacket.' }),
  /explicitly adult/
);

assert.throws(
  () => buildGenerationRequest({ subject: 'dragon', description: 'An original fantasy creature.' }),
  /Unsupported generation subject/
);

console.log('generation-director: PASS');
