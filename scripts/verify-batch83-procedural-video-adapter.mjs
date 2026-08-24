import assert from 'node:assert/strict';
import { buildVideoGenerationAdapter, buildProceduralSceneRequest } from '../src/videoGenerationV2.js';

const scene={id:'scene-action-fixed',role:'action',duration:2,direction:{environment:'night urban environment'},subjects:{subjectIds:['subject-1'],preserveIdentity:true},continuity:{matchColour:true},constraints:{originalOnly:true}};
const request={version:'video-generation-request-v2',type:'subject-scene',duration:2,subjectIds:['subject-1'],sceneBlueprint:scene};
const procedural=buildProceduralSceneRequest(scene);
assert.equal(procedural.renderer,'browser-world-synthesis-v2');
assert.equal(procedural.subjects.preserveIdentity,true);
assert.equal(procedural.constraints.originalOnly,true);
const adapter=buildVideoGenerationAdapter({proceduralGenerate:async req=>({blob:new Blob(['video'],{type:'video/webm'}),source:'test-procedural',duration:req.duration})});
const result=await adapter.generateScene(request);
assert.equal(result.status,'ready');
assert.equal(result.source,'test-procedural');
assert.ok(result.blob);
const guarded=buildVideoGenerationAdapter({});
const fallback=await guarded.generateScene(request);
assert.equal(fallback.status,'planned','Node must not pretend browser MediaRecorder produced video');
assert.equal(fallback.fallback,'browser-renderer');
console.log('batch83-procedural-video-adapter: PASS');
