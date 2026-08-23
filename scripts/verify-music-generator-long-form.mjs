import {buildMusicGenerationPlan} from '../src/musicCompositionV3.js';
const p=buildMusicGenerationPlan({duration:300,prompt:'five minute cinematic motorcycle film',genre:'cinematic',mood:'dark',energy:.8,bpm:112,filmType:'trailer'});
if(p.duration!==300||p.sections[p.sections.length-1].end!==300)throw new Error('Music composition does not cover full requested duration.');
if(p.sections.length<6)throw new Error('Long-form composition lacks enough sections.');
console.log('PASS: music generator composition contract covers full five-minute duration with developed sections.');
