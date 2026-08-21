import assert from 'node:assert/strict';
import {executeBenchmarkMatrix} from '../src/modelBenchmarkExecutionV1.js';
const report=await executeBenchmarkMatrix({adapter:{id:'test'},cases:[{id:'x',capability:'image-to-video'}],runner:async()=>({status:'generated'})});assert.equal(report.results[0].status,'complete');assert.equal(report.results[0].output.status,'generated');console.log('Model benchmark execution V1 verification passed');
