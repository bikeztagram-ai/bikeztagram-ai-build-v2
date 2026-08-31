import assert from 'node:assert/strict';
import { OUTPUT_PRESETS, resolveOutputPreset, outputPlanFields } from '../src/outputPresets.js';

assert.deepEqual([OUTPUT_PRESETS.portrait.width,OUTPUT_PRESETS.portrait.height],[1080,1920]);
assert.deepEqual([OUTPUT_PRESETS.square.width,OUTPUT_PRESETS.square.height],[1080,1080]);
assert.deepEqual([OUTPUT_PRESETS.landscape.width,OUTPUT_PRESETS.landscape.height],[1920,1080]);
assert.equal(resolveOutputPreset(undefined,'make this widescreen for youtube').id,'landscape');
assert.equal(resolveOutputPreset(undefined,'make a square feed post').id,'square');
assert.equal(resolveOutputPreset('portrait','widescreen').id,'portrait');
const plan=outputPlanFields('landscape');
assert.deepEqual(plan,{outputPreset:'landscape',outputWidth:1920,outputHeight:1080,outputAspectRatio:'16:9'});
console.log('Social output preset contract: PASS');
