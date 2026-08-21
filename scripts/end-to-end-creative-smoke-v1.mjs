import assert from 'node:assert/strict';
import {createMusicRuntimeAdapter} from '../src/realMusicRuntimeAdapterV1.js';
import {createVideoRuntimeAdapter} from '../src/realVideoRuntimeAdapterV1.js';
import {executeCandidates} from '../src/generationAdapterIntegrationV1.js';
const music=createMusicRuntimeAdapter({id:'music-test',capabilities:['text-to-music'],generateMusic:async r=>({kind:'audio',request:r})});
const video=createVideoRuntimeAdapter({id:'video-test',capabilities:['image-to-video'],generateScene:async r=>({kind:'video',request:r})});
const m=await executeCandidates({adapter:music,request:{type:'text-to-music'},count:2,score:async()=>80});const v=await executeCandidates({adapter:video,request:{type:'image-to-video'},count:2,score:async()=>90});assert.equal(m[0].output.kind,'audio');assert.equal(v[0].output.kind,'video');console.log('End-to-end creative smoke V1 passed');
