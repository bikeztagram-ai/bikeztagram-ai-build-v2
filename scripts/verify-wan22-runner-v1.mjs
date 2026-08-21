import assert from 'node:assert/strict';
import {createWan22Runner,normaliseVideoGeneration} from '../src/wan22RunnerV1.js';
const r=createWan22Runner();assert.equal((await r.generate({type:'image-to-video'})).status,'runtime-required');
const live=createWan22Runner({execute:async ({modelId})=>({status:'generated',url:'scene.mp4',duration:5,width:704,height:1280,fps:24,modelId,subjectIds:['subject-a']})});const out=normaliseVideoGeneration(await live.generate({type:'image-to-video'}));assert.equal(out.status,'generated');assert.equal(out.fps,24);assert.deepEqual(out.subjectIds,['subject-a']);console.log('Wan 2.2 runner V1 verification passed');
