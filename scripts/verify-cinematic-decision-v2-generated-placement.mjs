import {buildCinematicDecisionPipeline} from '../src/cinematicDecisionPipeline.js';
const result=buildCinematicDecisionPipeline({mediaItems:[{type:'video',id:'bike-1'}],prompt:'dark energetic cinematic motorcycle trailer',duration:30,cuts:[{purpose:'opening',start:0,duration:5,sourceIndex:0},{purpose:'action',start:5,duration:10,sourceIndex:0}],subjectIds:['bike'],generatedSceneBlueprints:[{id:'g1',role:'action',start:5,duration:2}]});
if(result.version!=='cinematic-decision-v2')throw new Error('Decision pipeline V2 missing.');
if(!result.contracts.generatedPlacementContinuity)throw new Error('Generated placement continuity contract missing.');
if(result.generatedPlacement.candidates.length!==1)throw new Error('Generated placement candidate missing.');
if(!result.contracts.musicDrivesEdit||!result.contracts.continuousTimeline)throw new Error('Existing cinematic contracts regressed.');
console.log('PASS: cinematic decision pipeline integrates continuity-aware generated placement without regressing core edit contracts.');
