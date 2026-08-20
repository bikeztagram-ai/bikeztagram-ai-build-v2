import assert from 'node:assert/strict';
import fs from 'node:fs';

const blueprint = fs.readFileSync(new URL('../src/universalProductionBlueprint.js', import.meta.url), 'utf8');
const director = fs.readFileSync(new URL('../src/director.js', import.meta.url), 'utf8');

assert.match(blueprint, /universal-production-v1/);
assert.match(blueprint, /subjectIdentity/);
assert.match(blueprint, /environmentConsistency/);
assert.match(blueprint, /generatedContentMustSupportStory/);
assert.match(blueprint, /preserveSubjectIdentity/);
assert.match(blueprint, /hook/);
assert.match(blueprint, /reveal/);
assert.match(blueprint, /hero/);
assert.match(director, /buildUniversalMediaProfile/);
assert.doesNotMatch(blueprint, /motorcycleModel|ninja1000|kawasaki/i);

console.log('batch13-universal-blueprint: PASS');
