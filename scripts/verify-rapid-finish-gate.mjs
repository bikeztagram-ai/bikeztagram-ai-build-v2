import {evaluateRapidFinishGate} from '../src/rapidFinishGate.js';
const ok=evaluateRapidFinishGate({plan:{cuts:[{}]},sources:[{type:'video',sourceUrl:'blob'}],renderPlan:{cuts:[{sourceType:'uploaded'}],renderContract:{continuous:true}}});
if(!ok.pass||ok.generatedInsertCount!==0)throw new Error('Rapid finish gate should pass clean real-footage plan.');
const bad=evaluateRapidFinishGate({plan:{cuts:[{}]},sources:[{type:'video'}],renderPlan:{cuts:[{sourceType:'uploaded'}],renderContract:{continuous:false}}});
if(bad.pass||!bad.blockers.includes('Timeline has gaps'))throw new Error('Rapid finish gate failed to block gaps.');
console.log('PASS: rapid finish gate blocks incomplete cinematic output.');
