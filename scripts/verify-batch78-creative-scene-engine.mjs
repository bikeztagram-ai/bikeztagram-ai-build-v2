import assert from 'node:assert/strict';
import { buildGeneratedSceneBlueprint, buildSceneGenerationSet, scoreGeneratedScene } from '../src/sceneGenerationV2.js';
import { buildProceduralSceneRequest, createVideoGenerationRequest } from '../src/videoGenerationV2.js';

const scene=buildGeneratedSceneBlueprint({prompt:'dark cinematic motorcycle trailer on a mountain road',role:'reveal',duration:3,subjectIds:['subject-1'],referenceAssets:['asset-1'],visual:{lighting:'dark/moody'}});
assert.equal(scene.version,'generated-scene-blueprint-v2');
assert.equal(scene.role,'reveal');
assert.equal(scene.constraints.originalOnly,true);
assert.equal(scene.subjects.preserveIdentity,true);
assert.ok(scene.direction.camera);
assert.ok(scene.direction.environment);
assert.ok(scoreGeneratedScene(scene,{role:'reveal'}).ready);

const set=buildSceneGenerationSet({prompt:'cinematic motorcycle film',duration:15,subjectIds:['subject-1'],referenceAssets:['asset-1'],musicEvents:[{type:'drop',time:8}]});
assert.equal(set.length,4);
assert.deepEqual(set.map(s=>s.role),['opening','reveal','action','hero']);

const request=createVideoGenerationRequest({type:'subject-scene',prompt:'original mountain-road reveal',duration:2,subjectIds:['subject-1'],sceneBlueprint:set[1]});
assert.equal(request.constraints.originalOnly,true);
const proc=buildProceduralSceneRequest(set[1]);
assert.equal(proc.renderer,'browser-world-synthesis-v2');
assert.equal(proc.subjects.preserveIdentity,true);
console.log('batch78-creative-scene-engine: PASS');
