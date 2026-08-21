import assert from 'node:assert/strict';
import {compileCreativeBrief} from '../src/creativePromptCompilerV1.js';
const b=compileCreativeBrief({prompt:'Make a dark cinematic motorcycle trailer',duration:15,aspectRatio:'9:16',assets:[{id:'bike'}]});
assert.equal(b.version,'creative-brief-v1');
assert.equal(b.assetIds[0],'bike');
assert.equal(b.requirements.generateMusic,true);
assert.equal(b.requirements.allowGeneratedScenes,true);
console.log('Creative brief V1 verification passed');
