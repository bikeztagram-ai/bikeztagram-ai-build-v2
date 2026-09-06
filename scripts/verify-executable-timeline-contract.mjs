import { buildExecutableTimeline, validateExecutableTimeline } from '../src/executableTimeline.js';

const plan={creativePrompt:'dark cinematic motorcycle action trailer',targetDuration:15,cuts:[
 {mediaId:'bike-1',duration:2,purpose:'opening reveal',motionStyle:'static'},
 {mediaId:'bike-2',duration:3,purpose:'fast motorcycle action',motionStyle:'static',trimStart:1,trimEnd:4,speed:1.1,speedEnd:1.35,transform:{scale:1.2,x:.1,y:-.05}},
 {mediaId:'bike-3',duration:2,purpose:'hero ending',transition:'hard-cut'}
]};
const executable=buildExecutableTimeline(plan);
const contract=validateExecutableTimeline(executable);
if(!contract.passed) throw new Error(`Executable timeline contract failed: ${contract.failures.join(', ')}`);
if(executable.cuts[0].mediaId!=='bike-1'||executable.cuts[1].mediaId!=='bike-2'||executable.cuts[2].mediaId!=='bike-3') throw new Error('Director-selected media was replaced.');
if(executable.cuts.some(c=>!c.role||!c.motionStyle||!c.transition||c.duration<=0)) throw new Error('Executable timeline is missing render directives.');
if(executable.cuts[1].motionStyle==='static') throw new Error('Action cut did not receive executable motion.');
if(executable.cuts[1].trimStart!==1||executable.cuts[1].trimEnd!==4) throw new Error('Timeline trim metadata was not preserved.');
if(executable.cuts[1].speed!==1.1||executable.cuts[1].speedEnd!==1.35) throw new Error('Variable speed metadata was not preserved.');
if(executable.cuts[1].transform.scale!==1.2) throw new Error('Transform metadata was not preserved.');
if(executable.executionVersion!=='director-execution-v2') throw new Error('Missing execution version marker.');
console.log('PASS executable director timeline contract');
