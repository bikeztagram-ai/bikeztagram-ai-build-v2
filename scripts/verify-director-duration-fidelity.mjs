import assert from 'node:assert/strict';
import { createAIEditPlan } from '../src/aiEditPlanner.js';
const analysis={filename:'bike.mp4',durationInSeconds:40,mediaType:'video',bestMoments:Array.from({length:12},(_,i)=>({start:i*3,end:i*3+3,score:90-i,mediaIndex:0,editorialRole:i===0?'opening':i===11?'hero-ending':'action'}))};
for(const target of [10,15,30]){const plan=createAIEditPlan(analysis,{maxCuts:12,targetDuration:target,creativePrompt:'fast cinematic motorcycle trailer'});const duration=plan.cuts.reduce((sum,cut)=>sum+Number(cut.duration||0),0);assert.ok(duration<=target+.01,`duration ${duration} exceeded target ${target}`);assert.ok(duration>=target*.9,`duration ${duration} was too short for target ${target}`);assert.equal(plan.duration,duration);}
const short=createAIEditPlan({...analysis,durationInSeconds:5},{maxCuts:8,targetDuration:15,creativePrompt:'cinematic'});assert.ok(short.duration<=15);
console.log('Director duration fidelity: PASS');
