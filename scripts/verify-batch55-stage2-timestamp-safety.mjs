import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = fs.readFileSync(new URL('../api/edit-plan.js', import.meta.url), 'utf8');
assert.match(file, /const momentLength=momentEnd-momentStart/);
assert.match(file, /if\(momentLength<0\.5\)return null/);
assert.match(file, /Math\.min\(momentEnd-0\.5/);
assert.match(file, /Math\.max\(startTime\+0\.5/);
assert.match(file, /safeEndTime>momentEnd/);
assert.match(file, /safeEndTime-startTime<0\.5/);
console.log('batch55-stage2-timestamp-safety: PASS');
