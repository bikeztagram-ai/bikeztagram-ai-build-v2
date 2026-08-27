import assert from 'node:assert/strict';
import {createVideoRuntimeAdapter,validateVideoRuntimeAdapter} from '../src/realVideoRuntimeAdapterV1.js';
const a=createVideoRuntimeAdapter({id:'local-video-candidate',capabilities:['image-to-video'],generateScene:async r=>({status:'generated',request:r})});assert.equal(validateVideoRuntimeAdapter(a).valid,true);assert.equal((await a.generate({type:'image-to-video'})).status,'generated');console.log('Real video runtime adapter V1 verification passed');
