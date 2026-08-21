import assert from 'node:assert/strict';
import {createGenerationJob,updateGenerationJob,completeGenerationJob,failGenerationJob,isGenerationRetryable} from '../src/generationJobAdapterV1.js';
let j=createGenerationJob({type:'image-to-video',input:{subjectIds:['bike']}});assert.equal(j.status,'queued');j=updateGenerationJob(j,{status:'running',progress:40,attempts:1});assert.equal(j.progress,40);j=failGenerationJob(j,'timeout');assert.equal(j.status,'failed');assert.equal(isGenerationRetryable(j),true);j=completeGenerationJob(j,{url:'scene.mp4'});assert.equal(j.progress,100);assert.equal(j.status,'complete');
console.log('Generation job adapter V1 verification passed');
