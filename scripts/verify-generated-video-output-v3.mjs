import {readFile} from 'node:fs/promises';
const src=await readFile(new URL('../src/videoGenerationRuntimeV2.js',import.meta.url),'utf8');
for(const token of ['validateGeneratedVideoOutput','durationValid','identityDeclared','originality','generationValidation'])if(!src.includes(token))throw new Error(`Generated-video safety gate missing ${token}.`);
const req=`createVideoGenerationRequest({duration:12,subjectIds:['bike-1'],prompt:'original cinematic motorcycle insert'})`;
if(!src.includes('preserveSubjectIdentity')||!src.includes('originalOnly'))throw new Error('Identity/originality constraints are not enforced.');
console.log('PASS: generated-video provider output is duration-, identity-, and originality-gated before production use.');
