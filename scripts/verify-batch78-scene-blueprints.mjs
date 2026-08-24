import assert from 'node:assert/strict';
import { buildGeneratedSceneBlueprint, buildSceneGenerationSet, scoreGeneratedScene } from '../src/sceneGenerationV2.js';

const input={prompt:'cinematic motorcycle reveal on a wet city road at night',duration:15,aspectRatio:'9:16',subjectIds:['subject-1'],referenceAssets:['asset-1'],visual:{style:'cinematic trailer'}};
const a=buildGeneratedSceneBlueprint({...input,role:'action',musicEvent:{type:'drop',time:6},seed:'fixed'});
const b=buildGeneratedSceneBlueprint({...input,role:'action',musicEvent:{type:'drop',time:6},seed:'fixed'});
assert.equal(a.id,b.id,'scene IDs must be deterministic for repeatable jobs');
assert.equal(a.musicEvent.time,6);
assert.equal(a.subjects.preserveIdentity,true);
assert.equal(a.constraints.originalOnly,true);
assert.equal(a.render.fallback,'browser-procedural-scene');
assert.equal(scoreGeneratedScene(a,{role:'action'}).ready,true);
const set=buildSceneGenerationSet({...input,musicEvents:[{type:'drop',time:6},{type:'outro',time:13}]});
assert.deepEqual(set.map(s=>s.role),['opening','reveal','action','hero']);
assert.ok(set.find(s=>s.role==='action')?.musicEvent?.type==='drop');
assert.ok(set.every(s=>s.duration>0));
console.log('batch78-scene-blueprints: PASS');
