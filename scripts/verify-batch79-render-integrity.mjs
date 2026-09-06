import fs from 'node:fs';
import assert from 'node:assert/strict';
import { planEditorialRhythm } from '../src/editorialRhythm.js';

const rhythm = planEditorialRhythm([
  { purpose: 'opening hook', directorSelectionScore: 190 },
  { purpose: 'build', directorSelectionScore: 150 },
  { purpose: 'hero ending', directorSelectionScore: 150 }
], { targetDuration: 6, creativePrompt: 'cinematic trailer' });

assert.equal(rhythm.length, 3);
assert.equal(rhythm[0].editorialRole, 'hook');
assert.equal(rhythm[2].editorialRole, 'hero');
assert.ok(rhythm[0].rhythmDuration > 0);
assert.ok(rhythm[2].rhythmDuration > rhythm[1].rhythmDuration);
assert.ok(Math.abs(rhythm.reduce((sum, cut) => sum + cut.rhythmDuration, 0) - 6) < 0.05);

const renderer = fs.readFileSync(new URL('../src/cinematicRendererV3.js', import.meta.url), 'utf8');
assert.match(renderer, /No playable production media source was supplied/);
assert.match(renderer, /Cut \$\{index\+1\} references missing production media/);
assert.doesNotMatch(renderer, /const g=ctx\.createLinearGradient\(0,0,canvas\.width,canvas\.height\)/);
assert.doesNotMatch(renderer, /for\(let i=0;i<14;i\+\+\)/);

console.log('Batch 79 render integrity verification: PASS');
