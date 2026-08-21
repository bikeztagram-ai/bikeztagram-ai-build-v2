/* Bikeztagram AI Creative Engine V1 — orchestration contract.
 * Keeps model adapters replaceable and the existing renderer untouched.
 */

const STAGES=['understand','direct','music','scenes','assemble','render','qa','revise','export'];

export function createCreativeEngineJob(input={}){
  return {version:'creative-engine-job-v1',id:input.id||`job-${Date.now()}`,brief:input.brief||'',assets:input.assets||[],preferences:input.preferences||{},stage:'understand',completed:[],outputs:{},attempts:{},errors:[],policy:input.policy||null};
}

export function createStagePlan(job,{director,music,video,quality}={}){
  return {version:'creative-engine-stage-plan-v1',jobId:job.id,stages:STAGES.map(stage=>({stage,status:job.completed.includes(stage)?'complete':'pending',handler:{understand:'media',direct:director,music,scenes:video,assemble:'timeline',render:'renderer',qa:quality,revise:'revision',export:'exporter'}[stage]||null}))};
}

export function recordStageResult(job,stage,result,{error=null}={}){
  if(!STAGES.includes(stage))throw new Error(`Unknown creative stage: ${stage}`);
  const completed=new Set(job.completed||[]); if(!error)completed.add(stage);
  return {...job,stage:error?stage:(STAGES[STAGES.indexOf(stage)+1]||'complete'),completed:[...completed],outputs:{...(job.outputs||{}),...(error?{}:{[stage]:result})},errors:error?[...(job.errors||[]),{stage,message:String(error)}]:job.errors||[],attempts:{...(job.attempts||{}),[stage]:(job.attempts?.[stage]||0)+1}};
}

export function nextCreativeStage(job){return STAGES.find(stage=>!(job.completed||[]).includes(stage))||'complete';}
