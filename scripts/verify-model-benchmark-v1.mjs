import assert from 'node:assert/strict';
import {createBenchmarkCase,scoreBenchmarkCase,rankModels,BENCHMARK_DIMENSIONS} from '../src/modelBenchmarkV1.js';
const c=createBenchmarkCase({id:'video-001',type:'image-to-video',input:{asset:'bike.jpg'}});assert.equal(c.version,'model-benchmark-v1');assert.equal(BENCHMARK_DIMENSIONS.length,9);
const score=scoreBenchmarkCase({scores:Object.fromEntries(BENCHMARK_DIMENSIONS.map(d=>[d,80])),evidence:['sample-output']});assert.equal(score.overall,80);assert.equal(score.passed,true);
assert.equal(rankModels([{name:'A',overall:70},{name:'B',overall:90}])[0].name,'B');
console.log('Model benchmark V1 verification passed');
