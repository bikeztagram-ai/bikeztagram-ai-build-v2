import { directCinematicEdits } from '../src/cinematicEditDirector.js';
const cuts=directCinematicEdits([{startTime:0,purpose:'opening'},{startTime:2,purpose:'build',section:'build'},{startTime:4,purpose:'reveal'},{startTime:6,purpose:'action'},{startTime:8,purpose:'hero'}],{beatGrid:[0,0.5357,1.0714,2.1428,4.2856,6.4284,8.5712]});
if(cuts[0].transition!=='fade-in')throw new Error('Opening transition missing.');
if(cuts[2].transition!=='flash-cut')throw new Error('Reveal transition missing.');
if(!/^whip-/.test(cuts[3].transition))throw new Error('Action transition missing.');
if(!cuts.some(c=>c.beatCut))throw new Error('Beat-aware cut mapping missing.');
console.log('PASS: cinematic edit director selects purposeful transitions, motion and beat anchors.');
