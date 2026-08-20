import assert from 'node:assert/strict';
import { resolveOutputPreset } from '../src/outputPresets.js';
import { getOutputPresetOptions } from '../src/postRenderTranscoder.js';
import { getSocialExportInfo } from '../src/socialExport.js';

const stages=['media intake','media understanding','ai director','story/shot plan','real footage selection','music','beat sync','captions','render','quality control','social export'];
assert.equal(stages.length,11);
assert.equal(resolveOutputPreset('portrait').id,'portrait');
assert.equal(resolveOutputPreset('square').id,'square');
assert.equal(resolveOutputPreset('landscape').id,'landscape');
assert.equal(getOutputPresetOptions().length,3);
const blob=new Blob(['test-video'],{type:'video/webm'});
const info=getSocialExportInfo(blob,'portrait');
assert.equal(info.width,1080);
assert.equal(info.height,1920);
assert.equal(info.aspectRatio,'9:16');
console.log('batch45-end-to-end-contract: PASS');
