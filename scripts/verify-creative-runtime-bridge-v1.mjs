import assert from 'node:assert/strict';
import {resolveGenerationAdapter,executeGenerationRequest} from '../src/creativeRuntimeBridgeV1.js';
const video={async generateScene(r){return {status:'generated',type:r.type}}};
assert.equal(resolveGenerationAdapter({type:'image-to-video'},{videoRuntime:video}).kind,'video');
const result=await executeGenerationRequest({type:'image-to-video'},{videoRuntime:video});assert.equal(result.status,'generated');
assert.equal((await executeGenerationRequest({type:'world-scene'},{})).status,'fallback-required');
console.log('Creative runtime bridge V1 verification passed');
