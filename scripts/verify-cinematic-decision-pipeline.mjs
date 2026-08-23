import {buildCinematicDecisionPipeline} from '../src/cinematicDecisionPipeline.js';
const result=buildCinematicDecisionPipeline({mediaItems:[{type:'video',id:'bike-1'}],prompt:'dark energetic cinematic motorcycle trailer',duration:30,cuts:[{purpose:'opening',start:0,duration:5,sourceIndex:0},{purpose:'build',start:5,duration:7,sourceIndex:0},{purpose:'action',start:12,duration:10,sourceIndex:0},{purpose:'hero',start:22,duration:8,sourceIndex:0}]});
if(!result.contracts.musicDrivesEdit||!result.contracts.continuousTimeline||!result.contracts.realFootageFirst)throw new Error('Integrated cinematic contracts missing.');
if(result.scenePolicy.generatedScenesEnabled)throw new Error('Generated scenes must be disabled by default.');
if(!result.music.composition.providerRequest?.sections?.length)throw new Error('Music generation plan missing.');
if(result.cuts.length!==4)throw new Error('Real-footage cuts were lost.');
if(result.cuts.slice(1).some(c=>!c.transition))throw new Error('Directed transition missing.');
console.log('PASS: music, edit, transitions and real-footage policy are integrated.');
