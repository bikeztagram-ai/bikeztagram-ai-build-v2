import assert from 'node:assert/strict';
import {createGenerationPolicy,approveGenerationRequest,chooseGenerationMode} from '../src/generationPolicyV2.js';
const p=createGenerationPolicy({maxGeneratedScenes:2});
assert.equal(approveGenerationRequest({type:'subject-scene',duration:3,originalOnly:true},p,{generatedScenes:1}).allowed,true);
assert.equal(approveGenerationRequest({type:'subject-scene',duration:3,originalOnly:true},p,{generatedScenes:2}).allowed,false);
assert.equal(chooseGenerationMode({localAvailable:true}),'local');
assert.equal(chooseGenerationMode({}),'fallback');
console.log('Generation policy V2 verification passed');
