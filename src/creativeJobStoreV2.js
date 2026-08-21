/* Resumable, serialisable Creative Engine job state. No external database required by the contract. */

export function createJobSnapshot(runtime={}){
  return JSON.parse(JSON.stringify({version:'creative-job-snapshot-v2',savedAt:Date.now(),stage:runtime.stage||'understand',completed:runtime.completed||[],outputs:runtime.outputs||{},attempts:runtime.attempts||{},errors:runtime.errors||[],job:runtime.job||null}));
}

export function restoreJobSnapshot(snapshot,{adapters={},maxAttempts=3}={}){
  if(!snapshot||snapshot.version!=='creative-job-snapshot-v2')throw new Error('Invalid Creative Engine job snapshot');
  return {...snapshot,version:'creative-runtime-v2',adapters,maxAttempts,updatedAt:Date.now()};
}

export function serialiseJobForLocalStorage(runtime){return JSON.stringify(createJobSnapshot(runtime));}
export function deserialiseJobFromLocalStorage(value,options={}){return restoreJobSnapshot(JSON.parse(value),options);}

export function getResumePoint(runtime){
  const stages=['understand','direct','music','scenes','assemble','render','qa','revise','export'];
  return stages.find(stage=>!(runtime?.completed||[]).includes(stage))||'complete';
}
