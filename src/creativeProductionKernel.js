/* Bikeztagram AI — Creative Engine production kernel.
   Orchestrates natural-language intent, uploaded assets, music, generated scenes,
   render planning and bounded QA without locking the product to a provider.
*/
const text=v=>String(v??'').trim();
const arr=v=>Array.isArray(v)?v:[];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
const uid=(prefix,i)=>`${prefix}-${Date.now().toString(36)}-${i}`;
export function compileCreativeProductionRequest({prompt='',assets=[],duration=15,aspectRatio='9:16'}={}){
 const cleanAssets=arr(assets).map((asset,index)=>({id:text(asset?.id)||uid('asset',index),type:text(asset?.type)||'unknown',name:text(asset?.name)||`Asset ${index+1}`,url:text(asset?.url),duration:clamp(asset?.duration||0,0,600),source:'uploaded'}));
 const p=text(prompt)||'Create a cinematic film from the supplied media.';
 return {version:'creative-production-request-v1',requestId:uid('job',0),prompt:p,duration:clamp(duration,5,600),aspectRatio:text(aspectRatio)||'9:16',assets:cleanAssets,capabilities:{creativeDirection:true,mediaAnalysis:true,originalMusic:true,generatedScenes:true,subjectContinuity:true,rendering:true,qualityRevision:true},policy:{originalCreativeOutput:true,providerAgnostic:true,noNamedWorkImitation:true}};
}
export function buildProductionStages(request){
 const r=request||{};return [
  {id:'understand',status:'ready',input:['prompt','assets'],output:'creativeBrief'},
  {id:'analyse-media',status:'ready',input:['assets'],output:'mediaAnalysis'},
  {id:'direct',status:'ready',input:['creativeBrief','mediaAnalysis'],output:'storyAndEditPlan'},
  {id:'compose-music',status:'ready',input:['creativeBrief','storyAndEditPlan'],output:'originalSoundtrack'},
  {id:'generate-scenes',status:'ready',input:['creativeBrief','storyAndEditPlan','mediaAnalysis'],output:'generatedMedia'},
  {id:'assemble',status:'ready',input:['storyAndEditPlan','assets','generatedMedia','originalSoundtrack'],output:'renderPlan'},
  {id:'render',status:'ready',input:['renderPlan'],output:'film'},
  {id:'quality',status:'ready',input:['film','renderPlan'],output:'qualityReport'},
  {id:'revise',status:'conditional',input:['qualityReport','renderPlan'],output:'revisedRenderPlan'},
  {id:'export',status:'ready',input:['film','qualityReport'],output:'finishedFilm'}
 ].map((stage,index)=>({...stage,index}));
}
export function createCreativeJob({prompt='',assets=[],duration=15,aspectRatio='9:16'}={}){const request=compileCreativeProductionRequest({prompt,assets,duration,aspectRatio});return{version:'creative-job-v1',jobId:request.requestId,request,stages:buildProductionStages(request),state:'planned',revisionBudget:2,outputs:{brief:null,analysis:null,director:null,music:null,generatedScenes:[],renderPlan:null,film:null,quality:null,export:null}};}
export function advanceCreativeJob(job,stageId,result){if(!job?.stages)return job;const stage=job.stages.find(s=>s.id===stageId);if(!stage)return job;const next={...job,outputs:{...(job.outputs||{})}};const key=stage.output==='creativeBrief'?'brief':stage.output==='mediaAnalysis'?'analysis':stage.output==='storyAndEditPlan'?'director':stage.output==='originalSoundtrack'?'music':stage.output==='generatedMedia'?'generatedScenes':stage.output==='renderPlan'?'renderPlan':stage.output==='film'?'film':stage.output==='qualityReport'?'quality':'finishedFilm';next.outputs[key]=result??null;next.stages=job.stages.map(s=>s.id===stageId?{...s,status:'complete'}:s);next.state=next.stages.every(s=>s.status==='complete'||s.status==='conditional')?'ready-for-export':'in-progress';return next;}
export function buildProviderRequirements(job){return{jobId:job?.jobId||null,providers:{director:{required:true,preferred:'model-or-local'},music:{required:true,preferred:'local-or-open-model'},videoGeneration:{required:false,preferred:'local-or-open-model'},render:{required:true,preferred:'browser'},qa:{required:true,preferred:'local'}},fallbacks:{music:'procedural-original',videoGeneration:'procedural-scene-generator',director:'local-heuristic-director'},reason:'Keep the Creative Engine executable when optional external providers are unavailable.'};}
