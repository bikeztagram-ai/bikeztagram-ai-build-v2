import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../api/edit-plan.js', import.meta.url), 'utf8');
const adapter = fs.readFileSync(new URL('../src/twoStageDirector.js', import.meta.url), 'utf8');

assert.match(api, /GENERAL-PURPOSE AI FILMMAKER/);
assert.match(api, /motorcycle, car, puppy, animal, person/);
assert.match(api, /targetDuration/);
assert.match(api, /subject and request/);
assert.match(api, /Do not force a motorcycle-style structure/);
assert.doesNotMatch(api, /actual motorcycle footage/);
assert.doesNotMatch(api, /cinematic motorcycle trailer/);
assert.doesNotMatch(api, /dark-cinematic/);

assert.match(adapter, /subjectLabel/);
assert.match(adapter, /preserve the supplied \$\{subject\}/);
assert.match(adapter, /two-stage-edit-plan-adapter-v2/);
assert.doesNotMatch(adapter, /supplied motorcycle/);
assert.doesNotMatch(adapter, /motorcycle and environment/);

console.log('batch14-universal-stage2: PASS');
