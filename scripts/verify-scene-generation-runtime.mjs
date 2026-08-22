import assert from 'node:assert/strict';
import { compileSceneGenerationRequest, chooseSceneRuntime, buildSceneTimeline } from '../src/sceneGenerationRuntime.js';
const r=compileSceneGenerationRequest({prompt:'original neon city establishing shot',duration:5,subjectRefs:['bike-1']});
assert.equal(r.original,true); assert.equal(r.subjectRefs[0],'bike-1'); assert.equal(chooseSceneRuntime({providerAvailable:false}),'local-procedural');
const t=buildSceneTimeline([r,{...r,duration:3}]); assert.equal(t.length,2); assert.equal(t[1].startTime,5); assert.equal(t[0].source,'generated');
console.log('Scene generation runtime: PASS');
