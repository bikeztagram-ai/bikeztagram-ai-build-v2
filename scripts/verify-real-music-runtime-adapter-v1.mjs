import assert from 'node:assert/strict';
import {createMusicRuntimeAdapter,validateMusicRuntimeAdapter} from '../src/realMusicRuntimeAdapterV1.js';
const a=createMusicRuntimeAdapter({id:'local-music-candidate',capabilities:['text-to-music'],generateMusic:async r=>({status:'generated',request:r})});assert.equal(validateMusicRuntimeAdapter(a).valid,true);assert.equal((await a.generate({type:'text-to-music'})).status,'generated');console.log('Real music runtime adapter V1 verification passed');
