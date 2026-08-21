import assert from 'node:assert/strict';
import {executeCandidates} from '../src/generationAdapterIntegrationV1.js';
const a={id:'local-candidate',async generate(r){return {candidate:r.candidateIndex};}};const r=await executeCandidates({adapter:a,request:{type:'image-to-video'},count:2,score:async o=>o.candidate+1});assert.equal(r.length,2);assert.equal(r[0].modelId,'local-candidate');assert.equal(r[0].quality,2);console.log('Generation adapter integration V1 verification passed');
