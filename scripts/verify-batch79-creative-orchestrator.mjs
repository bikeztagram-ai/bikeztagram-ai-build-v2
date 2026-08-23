import assert from 'node:assert/strict';
import { planCompleteFilm, buildCreativeDirectorSummary, executeGenerationBatch } from '../src/creativeFilmOrchestratorV2.js';

const plan=planCompleteFilm({
  prompt:'Create a dark cinematic motorcycle trailer with a mysterious opening, dramatic reveal, aggressive action and a clean hero ending.',
  assets:[
    {id:'asset-1',name:'bike-road.mp4',subjectId:'bike',sourceUrl:'https://example.invalid/bike-road.mp4'},
    {id:'asset-2',name:'bike-detail.jpg',subjectId:'bike',sourceUrl:'https://example.invalid/bike-detail.jpg'}
  ],duration:15,aspectRatio:'9:16'
});
assert.equal(plan.version,'complete-film-plan-v2');
assert.equal(plan.generatedScenes.length,4);
assert.equal(plan.direction.music.original,true);
assert.ok(plan.execution.parallelGroups.some(g=>g.id==='generation'&&g.parallel));
assert.equal(plan.generatedSceneScores.every(s=>s.ready),true);
const summary=buildCreativeDirectorSummary(plan);
assert.equal(summary.readyForProviderExecution,true);
const result=await executeGenerationBatch(plan,{
  musicGenerator:async()=>({audioBlob:'original'}),
  sceneGenerator:async(scene)=>({videoBlob:`generated:${scene.role}`})
});
assert.equal(result.success,true);
assert.equal(result.completed,5);
console.log('batch79-creative-orchestrator: PASS');
