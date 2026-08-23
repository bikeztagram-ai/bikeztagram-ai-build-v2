import { planGeneratedScenePlacement, validateGeneratedScenePlacement } from '../src/generatedScenePlacementV1.js';
const plan=planGeneratedScenePlacement({subjectIds:['bike'],media:[{id:'real-1'}],musicEvents:[{type:'drop',time:4}],scenes:[{id:'s1',role:'reveal',start:2,duration:2},{id:'s2',role:'action',start:4,duration:2}]});
if(plan.candidates.length!==2)throw new Error('Placement candidate count mismatch.');
if(plan.candidates[1].beatAligned!==true)throw new Error('Beat alignment was not detected.');
const good=validateGeneratedScenePlacement(plan.candidates[1],{identityPreserved:true,continuity:{previousMatched:true,nextMatched:true},original:true,beatAligned:true,duration:2});
if(!good.ok)throw new Error(`Valid placement rejected: ${good.reason}`);
const bad=validateGeneratedScenePlacement(plan.candidates[1],{identityPreserved:true,continuity:{previousMatched:false,nextMatched:true},original:true,beatAligned:true,duration:2});
if(bad.ok)throw new Error('Broken continuity was accepted.');
console.log('PASS: generated-scene placement requires continuity and respects beat alignment/duration.');
