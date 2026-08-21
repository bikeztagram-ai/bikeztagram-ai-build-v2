export function createGenerationJob({id=`job-${Date.now()}`,request,steps=[]}={}){return {version:'generation-job-v1',id,request,status:'pending',steps:steps.map((name,index)=>({name,index,status:'pending',output:null,error:null})),attempts:0};}
export function completeStep(job,index,output){return {...job,steps:job.steps.map((s,i)=>i===index?{...s,status:'complete',output,error:null}:s),status:'running'};}
export function failStep(job,index,error){return {...job,steps:job.steps.map((s,i)=>i===index?{...s,status:'failed',error:String(error)}:s),status:'paused'};}
export function nextPendingStep(job){return job.steps.find(s=>s.status==='pending'||s.status==='failed')||null;}
