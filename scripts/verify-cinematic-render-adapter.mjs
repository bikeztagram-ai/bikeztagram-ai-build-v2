import { adaptCinematicPlanForRenderer } from '../src/cinematicRendererAdapter.js';
const out=adaptCinematicPlanForRenderer({production:{beatAware:true},cuts:[{startTime:0,duration:2,purpose:'opening'},{startTime:2,duration:3,purpose:'action',transition:'whip-right'}]});
if(!out.renderContract.continuous||!out.renderContract.beatAware||!out.renderContract.qaRequired)throw new Error('Renderer contract flags missing.');
if(out.cuts[1].transition!=='whip-right')throw new Error('Directed transition was not preserved.');
if(out.cuts.some(c=>c.duration<.35))throw new Error('Invalid cut duration.');
console.log('PASS: cinematic production plan adapts safely to renderer contract.');
