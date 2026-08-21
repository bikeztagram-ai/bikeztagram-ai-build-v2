import assert from 'node:assert/strict';
import {createSubjectContinuityContract,buildContinuityCheck} from '../src/subjectContinuityContractV1.js';
const c=createSubjectContinuityContract([{id:'person',appearance:{helmet:true}}]);assert.equal(c.subjects[0].id,'person');const check=buildContinuityCheck({expected:c.subjects,observed:[{id:'person',identityPreserved:true,appearancePreserved:true}]});assert.equal(check[0].identityPreserved,true);console.log('Subject continuity contract V1 verification passed');
