import assert from 'node:assert/strict';
import {runCreativeBenchmark} from '../src/creativeBenchmarkRunnerV1.js';
const adapter={id:'test-model',async generate(input){return {status:'generated',input};}};const report=await runCreativeBenchmark([{id:'case-1',type:'image-to-video',input:{x:1}}],adapter,{observe:async()=>['observed']});assert.equal(report.modelId,'test-model');assert.equal(report.cases[0].output.status,'generated');assert.deepEqual(report.cases[0].evidence,['observed']);console.log('Creative benchmark runner V1 verification passed');
