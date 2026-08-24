import assert from 'node:assert/strict';
import { buildGeneratedSceneBlueprint, buildSceneGenerationSet, scoreGeneratedScene } from '../src/sceneGenerationV2.js';
import { buildProceduralSceneRequest, createVideoGenerationRequest } from '../src/videoGenerationV2.js';

const input={prompt:'dark cinematic motorcycle trailer on a mountain road',duration:15,aspectRatio:'9:16',subjectIds:['subject-1'],referenceAssets:['asset-1'],visual:{lighting:'dark/moody'}};
const scene=buildGeneratedSceneBlueprint({...input,role:'action',musicEvent:{type:'drop',time:8},seed:'fixed'});
const repeat=buildGeneratedSceneBlueprint({...input,role:'action',musicEvent:{type:'drop',time:8},seed:'fixed'});
assert.equal(scene.version,'generated-scene-blueprint-v3');
assert.equal(scene.id,repeat.id);
assert.equal(scene.role,'action');
assert.equal(scene.constraints.originalOnly,true);
assert.equal(scene.subjects.preserveIdentity,true);
assert.equal(scene.musicEvent.type,'drop');
assert.equal(scene.musicEvent.time,8);
assert.equal(scene.render.fallback,'browser-procedural-scene');
assert.ok(scoreGeneratedScene(scene,{role:'action'}).ready);

const set=buildSceneGenerationSet({...input,musicEvents:[{type:'drop',time:8},{type:'outro',time:13}]});
assert.equal(set.length,4);
assert.deepEqual(set.map(s=>s.role),['opening','reveal','action','hero']);
assert.ok(set.every(s=>s.duration>0));
assert.equal(set.find(s=>s.role==='action')?.musicEvent?.type,'drop');
assert.equal(set.find(s=>s.role==='hero')?.musicEvent?.type,'outro');

const request=createVideoGenerationRequest({type:'subject-scene',prompt:'original mountain-road reveal',duration:2,subjectIds:['subject-1'],sceneBlueprint:set[1]});
assert.equal(request.constraints.originalOnly,true);
const proc=buildProceduralSceneRequest(set[1]);
assert.equal(proc.renderer,'browser-world-synthesis-v2');
assert.equal(proc.subjects.preserveIdentity,true);
console.log('batch78-creative-scene-engine: PASS');
