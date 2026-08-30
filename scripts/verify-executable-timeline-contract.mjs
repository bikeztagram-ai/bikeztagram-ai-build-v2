import { buildExecutableTimeline, validateExecutableTimeline } from '../src/executableTimeline.js';

const plan={creativePrompt:'dark cinematic motorcycle action trailer',targetDuration:15,cuts:[
 {mediaId:'bike-1',duration:2,purpose:'opening reveal',motionStyle:'static'},
 {mediaId:'bike-2',duration:3,purpose:'fast motorcycle action',motionStyle:'static'},
 {mediaId:'bike-3',duration:2,purpose:'hero ending',transition:'hard-cut'}
]};
const executable=buildExecutableTimeline(plan);
const contract=validateExecutableTimeline(executable);
if(!contract.passed) throw new Error(`Executable timeline contract failed: ${contract.failures.join(', ')}`);
if(executable.cuts[0].mediaId!=='bike-1'||executable.cuts[1].mediaId!=='bike-2'||executable.cuts[2].mediaId!=='bike-3') throw new Error('Director-selected media was replaced.');
if(executable.cuts.some(c=>!c.role||!c.motionStyle||!c.transition||c.duration<=0)) throw new Error('Executable timeline is missing render directives.');
if(executable.cuts[1].motionStyle==='static') throw new Error('Action cut did not receive executable motion.');
if(executable.executionVersion!=='director-execution-v1') throw new Error('Missing execution version marker.');
console.log('PASS executable director timeline contract');
