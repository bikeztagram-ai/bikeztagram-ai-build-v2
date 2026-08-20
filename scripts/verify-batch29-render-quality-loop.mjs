import assert from 'node:assert/strict';
import fs from 'node:fs';

const loop=fs.readFileSync(new URL('../src/renderQualityLoop.js',import.meta.url),'utf8');
const qa=fs.readFileSync(new URL('../src/qa.js',import.meta.url),'utf8');

assert.match(loop,/renderProject/);
assert.match(loop,/validateRenderedVideo/);
assert.match(loop,/revisePlanAfterQA/);
assert.match(loop,/renderInspectImprove/);
assert.match(loop,/maxAttempts/);
assert.match(loop,/increase-output-luminance/);
assert.match(loop,/correct-editorial-duration/);
assert.match(qa,/sampleVideoFrames/);
assert.match(qa,/FAIL_TOO_DARK/);
assert.doesNotMatch(loop,/motorcycleModel|ninja1000|kawasaki/i);

console.log('batch29-render-quality-loop: PASS');
