import assert from 'node:assert/strict';
import { rankDirectorCandidates } from '../src/director.js';

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

console.log('PASS deterministic director candidate ranking contract');
