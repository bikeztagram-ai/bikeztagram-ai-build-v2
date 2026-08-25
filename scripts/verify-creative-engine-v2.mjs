import assert from 'node:assert/strict';
import { planCreativeFilm, createCreativeEngineRuntime, evaluateCreativeFilm } from '../src/creativeEngineRuntimeV2.js';
import { buildMusicBrief, alignCutsToMusic } from '../src/musicDirectorV2.js';
import { createVideoGenerationRequest } from '../src/videoGenerationV2.js';
import { createMusicRuntimeFallback } from '../src/musicProviderV2.js';

const assets=[
 {id:'bike-1',name:'ninja-road-hero.jpg',type:'image/jpeg',subjectId:'bike',subjectLabel:'bike',subjectType:'motorcycle'},
 {id:'ride-1',name:'road-action.mp4',type:'video/mp4',duration:4,subjectId:'bike',subjectLabel:'bike',subjectType:'motorcycle'}
];
const input={prompt:'Create a dark aggressive cinematic motorcycle trailer with a huge music drop and generated city bridge shots.',duration:20,aspectRatio:'9:16',assets};
const plan = planCreativeFilm(input);
assert.equal(plan.version,'creative-film-plan-v2');
assert.equal(plan.command.plan.brief.duration,20);
assert.ok(plan.command.plan.music.beatGrid.beats.length>10);
assert.equal(plan.command.plan.subjectManifest.subjects.length,1);
assert.ok(Array.isArray(plan.command.plan.generationRequests));
const music=buildMusicBrief({prompt:input.prompt,duration:20});
const cuts=alignCutsToMusic([{start:0,duration:1.1},{start:3.02,duration:1.4}],music);
assert.ok(cuts.every(c=>c.duration>=.25));
const video=createVideoGenerationRequest({type:'subject-scene',prompt:'Original cinematic city bridge shot',duration:2,subjectIds:['subject-1']});
assert.equal(video.constraints.preserveSubjectIdentity,true);
const localMusic=createMusicRuntimeFallback({duration:5,bpm:128,energy:.9});
assert.equal(localMusic.source,'local-original');
assert.ok(localMusic.audioBlob.size>44);
const runtime=createCreativeEngineRuntime(input,{});
assert.equal(runtime.runtime.stage,'understand');
const qa=evaluateCreativeFilm({story:70,pacing:75,musicImpact:90,beatUtilisation:85,shotVariety:80,continuity:80,captionQuality:80,technical:95});
assert.ok(qa.quality.score>0);
assert.equal(qa.revision.revise,false);
console.log('Creative Engine V2 verification passed:',JSON.stringify({score:qa.quality.score,generationRequests:plan.command.plan.generationRequests.length,subjects:plan.command.plan.subjectManifest.subjects.length,localMusicBytes:localMusic.audioBlob.size}));
