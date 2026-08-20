import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildUniversalProductionBlueprint } from '../src/universalProductionBlueprint.js';

const blueprintSource = fs.readFileSync(new URL('../src/universalProductionBlueprint.js', import.meta.url), 'utf8');
const apiSource = fs.readFileSync(new URL('../api/production-plan.js', import.meta.url), 'utf8');

assert.match(blueprintSource, /universal-production-v2/);
assert.match(blueprintSource, /subjectAgnostic/);
assert.match(blueprintSource, /appearance/);
assert.match(blueprintSource, /cameraContinuity/);
assert.doesNotMatch(blueprintSource, /motorcycleModel|ninja1000|kawasaki/i);
assert.doesNotMatch(apiSource, /motorcycle|ninja1000|kawasaki/i);

const cases = [
  { subject: { description: 'golden retriever puppy running through a garden', identity: 'golden retriever puppy' }, environment: 'garden', prompt: 'cute cinematic puppy adventure' },
  { subject: { description: 'red sports car on a mountain road', identity: 'red sports car' }, environment: 'mountain road', prompt: 'epic cinematic car commercial' },
  { subject: { description: 'traveller walking beside an Icelandic waterfall', identity: 'traveller' }, environment: 'Iceland waterfall', prompt: 'emotional cinematic travel film' },
  { subject: { description: 'wireless headphones on a studio table', identity: 'wireless headphones' }, environment: 'studio', prompt: 'premium product reveal' }
];

for (const testCase of cases) {
  const result = buildUniversalProductionBlueprint({
    ...testCase,
    bestMoments: [
      { start: 0, end: 2, score: 90, description: testCase.subject.description, subjectType: 'subject' },
      { start: 2, end: 4, score: 80, description: `movement in ${testCase.environment}`, subjectType: 'subject' },
      { start: 4, end: 6, score: 85, description: `hero composition of ${testCase.subject.identity}`, subjectType: 'subject' }
    ]
  }, testCase.prompt, { targetDuration: 15 });

  assert.equal(result.subject, testCase.subject.description);
  assert.equal(result.environment, testCase.environment);
  assert.equal(result.generationPolicy.subjectAgnostic, true);
  assert.equal(result.generationPolicy.preserveSubjectIdentity, true);
  assert.ok(result.selection.length >= 3);
  assert.ok(result.storyArc.includes('hook'));
  assert.ok(result.storyArc.includes('hero'));
}

console.log('batch14-universal-production: PASS');
