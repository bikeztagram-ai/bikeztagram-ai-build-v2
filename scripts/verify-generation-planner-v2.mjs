import assert from 'node:assert/strict';
import {planGeneration,addGeneratedSegment,buildContinuityContract} from '../src/generationPlannerV2.js';
const p=planGeneration({idea:'A fantasy city rises from the ocean',duration:12,subjects:[{id:'hero'}]});assert.equal(p.version,'generation-plan-v2');assert.equal(p.tasks.length,8);assert.equal(p.duration,12);
const p2=addGeneratedSegment(p,{type:'environment',start:2,end:5,prompt:'ocean city'});assert.equal(p2.segments.length,2);
assert.deepEqual(buildContinuityContract({subjects:[{id:'hero'}]}).subjectIds,['hero']);
console.log('Generation planner V2 verification passed');
