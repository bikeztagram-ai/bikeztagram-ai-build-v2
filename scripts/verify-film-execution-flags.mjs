import {buildFilmExecutionPlan} from '../src/filmExecutionPlanV2.js';
const real=buildFilmExecutionPlan({mediaItems:[{id:'bike-1'}],cuts:[{sourceIndex:0,startTime:0,endTime:2,duration:2}],prompt:'cinematic motorcycle film',requestedDuration:15,useGeneratedScenes:false,allowGeneratedInserts:false});
if(real.execution.generatedScenesOptIn!==false)throw new Error('Generated scenes must remain opt-in when disabled.');
const generated=buildFilmExecutionPlan({mediaItems:[{id:'bike-1'}],cuts:[{sourceIndex:0,startTime:0,endTime:2,duration:2}],prompt:'cinematic motorcycle film',requestedDuration:15,useGeneratedScenes:true,allowGeneratedInserts:true});
if(generated.execution.generatedScenesOptIn!==true)throw new Error('Generated-scene opt-in flag did not propagate.');
console.log('PASS: generated-scene execution flag matches actual scene policy.');
