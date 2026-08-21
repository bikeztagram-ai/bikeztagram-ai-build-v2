import assert from 'node:assert/strict';
import {scoreUniversalCreativeQA,buildUniversalRevisionRequest} from '../src/universalCreativeQAV2.js';
const qa=scoreUniversalCreativeQA({story:80,pacing:50,visualQuality:75,subjectConsistency:40,motionQuality:65,continuity:45,musicImpact:30,beatUtilisation:35,shotVariety:70,promptFidelity:55,technicalPass:true});assert.equal(qa.technicalPass,true);assert.ok(qa.weakest.includes('musicImpact'));const r=buildUniversalRevisionRequest(qa);assert.equal(r.actions[0].action,'regenerate-music');console.log('Universal creative QA V2 verification passed');
