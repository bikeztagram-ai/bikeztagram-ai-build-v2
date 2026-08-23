import assert from 'node:assert/strict';
import {createGenerationJob,completeStep,failStep,nextPendingStep} from '../src/generationJobResumeV1.js';
let j=createGenerationJob({request:{type:'world-scene'},steps:['music','scene','assembly']});j=completeStep(j,0,{id:'music'});j=failStep(j,1,'temporary');assert.equal(j.status,'paused');assert.equal(nextPendingStep(j).name,'scene');j=completeStep(j,1,{id:'scene'});assert.equal(nextPendingStep(j).name,'assembly');console.log('Generation job resume V1 verification passed');
