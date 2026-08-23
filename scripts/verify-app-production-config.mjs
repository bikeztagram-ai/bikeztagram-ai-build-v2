import {buildAppProductionConfig} from '../src/appProductionConfig.js';
const c=buildAppProductionConfig({duration:600,prompt:'10 minute motorcycle film',music:{genre:'cinematic',bpm:112}});
for(const [name,value] of [['duration',c.duration],['director.targetDuration',c.director.targetDuration],['render.targetDuration',c.render.targetDuration],['render.expectedDuration',c.render.expectedDuration],['qa.expectedDuration',c.qa.expectedDuration],['music.duration',c.music.duration]])if(value!==600)throw new Error(`${name} did not receive 600 seconds`);
if(c.durationUi.value!==600||!c.durationUi.longForm)throw new Error('Duration UI model not connected.');
console.log('PASS: app production configuration propagates duration to director, music, render and QA.');
