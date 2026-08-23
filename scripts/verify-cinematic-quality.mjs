import { inspectCinematicResult, repairCinematicPlan } from '../src/cinematicQualityEngine.js';
import { buildCinematicAudioMix } from '../src/cinematicAudioMix.js';
const soundtrack={sections:[{role:'intro'},{role:'build'},{role:'hero'}],beatGrid:[0,.5,1,1.5]};
const timeline={duration:6,cuts:[{startTime:0,duration:2,mediaIndex:0},{startTime:2,duration:2,mediaIndex:1},{startTime:4,duration:2,mediaIndex:2}],gaps:[]};
const qa=inspectCinematicResult({timeline,soundtrack});if(!qa.pass)throw new Error('Valid cinematic contract failed QA.');
const broken={cuts:[{startTime:0,duration:2,mediaIndex:0},{startTime:4,duration:2,mediaIndex:1}]};const repaired=repairCinematicPlan(broken);if(repaired.cuts[1].startTime!==2)throw new Error('Repair did not remove timeline gap.');
const mix=buildCinematicAudioMix({energy:.8,hasSourceAudio:true});if(!mix.music.duckUnderSource||mix.master.peakCeiling>.96)throw new Error('Audio mix contract invalid.');
console.log('PASS: cinematic QA, automatic gap repair and audio mix contracts.');
