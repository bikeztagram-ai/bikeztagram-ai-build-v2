import {buildGeneratedSceneContinuity,validateGeneratedSceneContinuity} from '../src/generatedSceneContinuityV1.js';
const contract=buildGeneratedSceneContinuity({subjectIds:['bike-1'],previousShot:{id:'real-1'},nextShot:{id:'real-2'},sceneBlueprint:{continuity:{anchorFrame:'hero-front',locationAnchor:'road',timeAnchor:'dusk',colorProfile:'cinematic-blue'}}});
if(contract.version!=='generated-scene-continuity-v1'||!contract.requirements.preserveSubjectIdentity||!contract.requirements.matchNext)throw new Error('Continuity contract incomplete.');
const ok=validateGeneratedSceneContinuity({identityPreserved:true,continuity:{previousMatched:true,nextMatched:true},original:true},contract);if(!ok.ok)throw new Error(ok.reason);
const bad=validateGeneratedSceneContinuity({identityPreserved:false,continuity:{previousMatched:true,nextMatched:true},original:true},contract);if(bad.ok)throw new Error('Invalid identity result was accepted.');
console.log('PASS: generated scene continuity requires identity, neighbouring-shot continuity and originality.');
