import { alignPlanToBeats, buildMusicEditEvents } from '../src/musicTimelineDirector.js';

const plan={targetDuration:15,cuts:[
  {mediaIndex:0,duration:2.8},
  {mediaIndex:1,duration:3.2},
  {mediaIndex:2,duration:3.6},
  {mediaIndex:0,duration:3.1},
  {mediaIndex:1,duration:2.3}
]};
const soundtrack={bpm:112,beatGrid:Array.from({length:32},(_,i)=>Number((i*60/112).toFixed(4)))};

const result=alignPlanToBeats(plan,soundtrack);
if(!result.changed)throw new Error('Expected beat alignment to change the plan.');
if(result.beatsUsed!==32)throw new Error(`Expected 32 beats, received ${result.beatsUsed}.`);
if(result.plan.cuts.some(c=>!c.beatSection||!Number.isFinite(Number(c.timelineStart))))throw new Error('Beat metadata was not attached to every cut.');
const events=buildMusicEditEvents(result.plan,soundtrack);
if(events.length!==plan.cuts.length)throw new Error('Expected one music edit event per cut.');
if(events.some(e=>!['intro','build','escalation','drop','hero-outro'].includes(e.section)))throw new Error('Unknown music section emitted.');
console.log(`Music timeline PASS • ${events.length} edit events • ${result.beatsUsed} beats mapped`);
