import assert from 'node:assert/strict';
import { compileCreativeBrief, briefToProviderPrompt } from '../src/creative/creativeBriefCompiler.js';

const brief = compileCreativeBrief({
  request: 'Put my bike into an original futuristic chase sequence.',
  output: 'TRAILER',
  mood: 'EPIC',
  durationSeconds: 30,
  references: [
    { id: 'bike', role: 'SUBJECT', description: 'Uploaded motorcycle', preserve: ['OBJECT_DETAILS'] },
    { id: 'rider', role: 'CHARACTER', description: 'Uploaded person', preserve: ['IDENTITY'] },
  ],
});

assert.equal(brief.schema, 'bikeztagram.creative-brief.v1');
assert.equal(brief.output, 'TRAILER');
assert.equal(brief.durationSeconds, 30);
assert.equal(brief.continuity.preserveReferenceIdentity, true);
assert.equal(brief.continuity.preserveObjectDetails, true);
assert.match(briefToProviderPrompt(brief), /original trailer production/i);
assert.throws(() => briefToProviderPrompt({}), /creative-brief.v1/);

console.log('PASS: creative brief v1');
