import assert from 'node:assert/strict';
import {createLocalVideoRuntime,normaliseVideoResult} from '../src/localVideoRuntimeV1.js';
const unavailable=createLocalVideoRuntime();assert.equal((await unavailable.generateScene({type:'image-to-video'})).status,'fallback-required');
const runtime=createLocalVideoRuntime({available:true,generate:async r=>({status:'generated',videoUrl:'scene.mp4',duration:3,width:1080,height:1920,subjectIds:['bike'],continuityKey:'bike-night',modelId:'local-test'})});
const result=normaliseVideoResult(await runtime.generateScene({type:'image-to-video'}));assert.equal(result.status,'generated');assert.equal(result.subjectIds[0],'bike');assert.equal(result.height,1920);
console.log('Local video runtime V1 verification passed');
