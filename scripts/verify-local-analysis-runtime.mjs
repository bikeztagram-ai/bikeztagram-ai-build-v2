import assert from 'node:assert/strict';
import { analyseLocalMedia } from '../src/localMediaAnalysis.js';

assert.equal(typeof analyseLocalMedia, 'function');
assert.match((await import('../src/mediaAnalysisClient.js')).analyseMedia.toString(), /analyseMediaLocally/);
assert.throws(() => analyseLocalMedia([]), /No media supplied/);
console.log('Local analysis runtime contract: PASS');
