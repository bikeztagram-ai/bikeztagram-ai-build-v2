import assert from 'node:assert/strict';
import {generateVideoCandidates,selectVideoCandidate} from '../src/videoGenerationSelectionV1.js';
const c=await generateVideoCandidates({request:{prompt:'original scene'},count:3,generate:async({candidateIndex})=>({id:candidateIndex}),score:async o=>o.id});assert.equal(c[0].output.id,2);assert.equal(selectVideoCandidate(c).output.id,2);console.log('Video generation selection V1 verification passed');
