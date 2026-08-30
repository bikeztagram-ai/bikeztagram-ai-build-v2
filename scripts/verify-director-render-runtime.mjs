import { applyDirectorRenderCues, inferEditorialRole, validateDirectorRenderCues } from '../src/directorRenderRuntime.js';

const plan={creativePrompt:'cinematic motorcycle trailer',cuts:[
  {mediaIndex:0,purpose:'opening'},
  {mediaIndex:1,purpose:'rider acceleration action'},
  {mediaIndex:2,purpose:'hero reveal'}
]};
const result=applyDirectorRenderCues(plan);
const validation=validateDirectorRenderCues(result);
if(!validation.ok) throw new Error(`Director render runtime invalid: ${validation.errors.join(', ')}`);
if(result.cuts[0].role!=='hook') throw new Error('Opening cut did not become hook.');
if(result.cuts[1].role!=='action') throw new Error('Action cut did not become action role.');
if(result.cuts[2].role!=='hero-ending') throw new Error('Final cut did not become hero-ending.');
if(result.cuts[1].motionStyle!=='pan-right') throw new Error('Action motion cue not applied.');
if(result.cuts[0].transition!=='fade-in') throw new Error('Hook transition not applied.');
if(result.cuts[2].transition!=='fade-out') throw new Error('Hero-ending transition not applied.');
if(inferEditorialRole({role:'reveal'},1,3)!=='reveal') throw new Error('Explicit role was not preserved.');
console.log('Director render runtime verification: PASS');
