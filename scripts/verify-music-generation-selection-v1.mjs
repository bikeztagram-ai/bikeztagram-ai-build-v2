import assert from 'node:assert/strict';
import {generateMusicCandidates,selectMusicCandidate} from '../src/musicGenerationSelectionV1.js';
const c=await generateMusicCandidates({request:{prompt:'cinematic'},count:3,generate:async({candidateIndex})=>({id:candidateIndex}),score:async o=>o.id});assert.equal(c[0].output.id,2);assert.equal(selectMusicCandidate(c).output.id,2);console.log('Music generation selection V1 verification passed');
