import assert from 'node:assert/strict';
import {createCreativeModelAdapter,validateAdapter} from '../src/creativeModelAdapterV2.js';
const a=createCreativeModelAdapter({id:'local-test',kind:'video',capabilities:['image-to-video'],local:true,commercialEligible:true,generate:async()=>({status:'generated'})});assert.equal(validateAdapter(a).valid,true);assert.equal((await a.generate({})).status,'generated');const bad=createCreativeModelAdapter({id:'x',kind:'video'});assert.equal(validateAdapter(bad).valid,false);console.log('Creative model adapter V2 verification passed');
