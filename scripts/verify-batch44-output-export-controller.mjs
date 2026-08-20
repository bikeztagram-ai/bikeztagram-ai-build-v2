import assert from 'node:assert/strict';
import { resolveOutputPreset } from '../src/outputPresets.js';
assert.equal(resolveOutputPreset('portrait').id,'portrait');
assert.equal(resolveOutputPreset('square').width,1080);
assert.equal(resolveOutputPreset('landscape').height,1080);
console.log('batch44-output-export-controller: PASS');
