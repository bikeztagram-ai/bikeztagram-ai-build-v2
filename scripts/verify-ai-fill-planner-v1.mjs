import assert from 'node:assert/strict';
const scenes=[{id:'s1',purpose:'hook',duration:2,sourceType:'uploaded'},{id:'s2',purpose:'reveal',duration:3,sourceType:'missing',requiredShot:'low angle bike reveal',subjectIds:['bike']},{id:'s3',purpose:'action',duration:4,sourceType:'uploaded'}];
const fill=scenes.filter(s=>s.sourceType==='missing').map(s=>({sceneId:s.id,role:s.purpose,duration:s.duration,prompt:s.requiredShot,subjectIds:s.subjectIds||[],constraints:{originalOnly:true,matchContinuity:true,doNotAlterSubjectIdentity:true}}));
assert.equal(fill.length,1);assert.equal(fill[0].sceneId,'s2');assert.equal(fill[0].constraints.originalOnly,true);assert.equal(fill[0].constraints.matchContinuity,true);assert.deepEqual(fill[0].subjectIds,['bike']);
console.log('AI fill planner V1: PASS');
