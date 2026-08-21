export function createRemoteGenerationJob({jobId,kind,runtimeId,modelId,request,callback=null}={}){return {version:'remote-generation-job-v1',jobId,kind,runtimeId,modelId,request,callback,status:'queued',execution:'remote-worker',createdAt:new Date().toISOString()};}
export function updateRemoteGenerationJob(job,patch={}){return {...job,...patch,updatedAt:new Date().toISOString()};}
export function isTerminalJobStatus(status){return ['completed','failed','cancelled'].includes(status);}
