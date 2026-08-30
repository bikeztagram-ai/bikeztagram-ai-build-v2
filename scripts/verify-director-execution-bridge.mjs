import { buildExecutableDirectorPlan, validateExecutableDirectorPlan } from '../src/directorExecution.js';

const mediaItems=[
  {id:'a',type:'video/mp4',description:'wide motorcycle approach'},
  {id:'b',type:'video/mp4',description:'rider accelerating through corner'},
  {id:'c',type:'image/jpeg',description:'detailed motorcycle hero portrait'},
  {id:'d',type:'video/mp4',description:'road landscape sunset'},
  {id:'e',type:'video/mp4',description:'close detail of controls'}
];
const decisions=mediaItems.map((media,index)=>({id:`d${index}`,mediaIndex:index,subjectType:index===3?'landscape':'vehicle',score:95-index*7}));
const plan=buildExecutableDirectorPlan({mediaItems,decisions,targetDuration:15,creativePrompt:'cinematic motorcycle trailer'});
const result=validateExecutableDirectorPlan(plan,mediaItems);
const roles=plan.cuts.map(c=>c.role);
const required=['hook','build','action','reveal','hero-ending'];
if(!result.ok)throw new Error(`Execution bridge invalid: ${result.errors.join(',')}`);
for(const role of required)if(!roles.includes(role))throw new Error(`Missing required role: ${role}`);
if(plan.cuts.some(c=>c.generated))throw new Error('Uploaded-media bridge unexpectedly generated a source.');
if(plan.cuts.some(c=>!c.directorDecisionId||!c.cameraIntent||!c.motionStyle))throw new Error('Director decision metadata was not preserved.');
console.log(JSON.stringify({ok:true,version:plan.version,cutCount:plan.cuts.length,roles,subjectCounts:plan.director.subjectCounts},null,2));
