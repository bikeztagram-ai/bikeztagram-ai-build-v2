import assert from 'node:assert/strict';
import {createUniversalGenerationRequest,validateUniversalRequest,decomposeCreativeIdea,GENERATION_TYPES} from '../src/universalGenerationSchemaV1.js';
const r=createUniversalGenerationRequest({type:'character-action',prompt:'Create an original cinematic scene of two explorers entering a floating city',duration:8,subjects:[{id:'person-a'},{id:'person-b'}]});
assert.ok(GENERATION_TYPES.includes('character-action'));assert.equal(validateUniversalRequest(r).valid,true);assert.deepEqual(decomposeCreativeIdea({prompt:r.prompt,subjects:r.subjects}).subjectIds,['person-a','person-b']);
const bike=createUniversalGenerationRequest({type:'image-to-video',prompt:'Animate the supplied product naturally',assets:[{id:'asset-1'}]});assert.equal(validateUniversalRequest(bike).valid,true);
console.log('Universal generation schema V1 verification passed');
