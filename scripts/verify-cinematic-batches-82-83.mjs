import { buildCinematicSoundtrack } from '../src/cinematicSoundtrackEngine.js';
import { buildContinuousTimeline, findTimelineGaps } from '../src/cinematicTimeline.js';

const soundtrack=buildCinematicSoundtrack({duration:15,bpm:112,energy:.8,mood:'dark cinematic'});
if(soundtrack.sections.length<3)throw new Error('Soundtrack must contain multiple sections.');
if(soundtrack.beatGrid.length<20)throw new Error('Soundtrack beat grid is incomplete.');
if(!soundtrack.sections.some(s=>s.role==='build')||!soundtrack.sections.some(s=>s.role==='hero'))throw new Error('Soundtrack lacks build/hero structure.');

const timeline=buildContinuousTimeline([
 {mediaIndex:0,duration:2,purpose:'opening'},
 {mediaIndex:1,duration:3,purpose:'build'},
 {mediaIndex:2,duration:2.5,purpose:'reveal'},
 {mediaIndex:3,duration:3,purpose:'action'},
 {mediaIndex:4,duration:3,purpose:'hero'}
],13.5);
const gaps=findTimelineGaps(timeline.cuts);
if(gaps.length)throw new Error(`Timeline contains ${gaps.length} unintended gaps.`);
for(let i=1;i<timeline.cuts.length;i++)if(Math.abs(timeline.cuts[i].startTime-(timeline.cuts[i-1].startTime+timeline.cuts[i-1].duration))>.001)throw new Error('Timeline cuts are not contiguous.');
if(!timeline.cuts.some(c=>c.transition==='flash-cut'))throw new Error('Reveal transition contract missing.');
if(!timeline.cuts.some(c=>/^whip-/.test(c.transition)))throw new Error('Action transition contract missing.');
console.log('PASS: soundtrack has sections + beat grid; timeline has zero unintended gaps and purposeful transitions.');
