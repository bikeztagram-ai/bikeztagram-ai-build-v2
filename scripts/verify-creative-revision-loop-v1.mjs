import assert from 'node:assert/strict';
import {runCreativeRevisionLoop} from '../src/creativeRevisionLoopV1.js';
let calls=0;const result=await runCreativeRevisionLoop({initial:{v:0},quality:async()=>({score:++calls>=2?85:50}),generate:async({current})=>({v:current.v+1}),maxAttempts:3});assert.equal(result.complete,true);assert.ok(result.history.length<=3);assert.equal(result.output.v,1);console.log('Creative revision loop V1 verification passed');
