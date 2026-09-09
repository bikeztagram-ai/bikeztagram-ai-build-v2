import assert from 'node:assert/strict';
import { buildCoveragePlan, rankDirectorCandidates } from '../src/director.js';

const candidates=[
  {mediaIndex:0,subjectRole:'vehicle',score:90},
  {mediaIndex:1,subjectRole:'vehicle',score:89},
  {mediaIndex:2,subjectRole:'landscape',score:84},
  {mediaIndex:3,subjectRole:'person',score:83}
];

const ranked=rankDirectorCandidates(candidates);
assert.deepEqual(ranked.map(item=>item.mediaIndex),[0,2,3,1]);
assert.deepEqual(rankDirectorCandidates(candidates).map(item=>item.mediaIndex),ranked.map(item=>item.mediaIndex));
assert.equal(rankDirectorCandidates(null).length,0);
assert.equal(rankDirectorCandidates(undefined).length,0);

const coverage=buildCoveragePlan([
  {name:'vehicle hero',type:'image',width:1920,height:1080},
  {name:'vehicle action',type:'video',duration:3,motionScore:8},
  {name:'mountain landscape',type:'image',width:1920,height:1080},
  {name:'rider portrait',type:'image',width:1200,height:1600}
],{creativePrompt:'cinematic action reveal',maxShots:4});
assert.equal(coverage.length,4);
assert.equal(new Set(coverage.map(item=>item.mediaIndex)).size,coverage.length);
assert.ok(new Set(coverage.map(item=>item.subjectType)).size>=3);

console.log('PASS deterministic director candidate ranking and coverage integration contract');
