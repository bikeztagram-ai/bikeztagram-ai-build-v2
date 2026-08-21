/* Normalises long-running local/remote generation into one resumable job contract. */
export function createGenerationJob({type,input,modelId='auto'}={}){return {version:'generation-job-v1',id:`gen-${Date.now()}`,type:type||'unknown',input:input||{},modelId,status:'queued',progress:0,output:null,error:null};}
export function updateGenerationJob(job,patch={}){return {...job,...patch,progress:Math.max(0,Math.min(100,Number(patch.progress??job.progress)||0))};}
export function completeGenerationJob(job,output){return updateGenerationJob(job,{status:'complete',progress:100,output,error:null});}
export function failGenerationJob(job,error){return updateGenerationJob(job,{status:'failed',error:String(error||'generation failed')});}
export function isGenerationRetryable(job,{maxAttempts=3}={}){return job?.status==='failed'&&Number(job?.attempts||0)<maxAttempts;}
