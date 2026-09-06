const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const retryableStatus=status=>status===408||status===425||status===429||status>=500;
const finitePositive=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):fallback;
function retryAfterMs(response,fallback=1500){const header=response?.headers?.get?.('retry-after');if(!header)return fallback;const seconds=Number(header);if(Number.isFinite(seconds))return Math.max(250,Math.min(30000,seconds*1000));const at=Date.parse(header);return Number.isFinite(at)?Math.max(250,Math.min(30000,at-Date.now())):fallback;}
async function readJson(response){try{return await response.json()}catch{return{}}}

export async function generateAIVideoScene({prompt,duration=5,ratio='720:1280',promptImage='',provider='auto',dryRun=false,onProgress,onStatus,pollAttempts=60,pollIntervalMs=5000}={}){
  const startedAt=Date.now();
  const report=(status,extra={})=>onStatus?.({status,elapsedMs:Date.now()-startedAt,...extra});
  report('starting',{duration,ratio,mode:promptImage?'image-to-video':'text-to-video'});
  const start=await fetch('/api/video',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,duration,ratio,promptImage:promptImage||undefined,provider,dryRun:Boolean(dryRun)})});
  if(!start.ok){const data=await readJson(start);report('start-failed',{httpStatus:start.status});if(start.status===503)return null;throw Error(data.error||'AI video generation could not start.');}
  const task=await readJson(start);
  if(dryRun){report('dry-run-complete',{routing:task.routing||null});return{status:'dry-run',provider:start.headers.get('x-bikeztagram-provider')||'runway-model-router',routing:task.routing||null,task,elapsedMs:Date.now()-startedAt};}
  if(!task?.id)throw Error('Runway did not return a generation task id.');
  const attempts=Math.max(1,Math.min(120,Math.round(finitePositive(pollAttempts,60))));
  const interval=Math.max(500,Math.min(30000,Math.round(finitePositive(pollIntervalMs,5000))));
  let transientFailures=0;
  for(let attempt=0;attempt<attempts;attempt++){
    await sleep(attempt?interval:2000);
    let r;
    try{r=await fetch(`/api/video?id=${encodeURIComponent(task.id)}`)}catch(error){transientFailures+=1;report('poll-network-retry',{attempt:attempt+1,attempts,error:error?.message||String(error)});if(transientFailures>5)throw Error(`Could not read AI video generation status: ${error?.message||String(error)}`);await sleep(1500*transientFailures);continue;}
    if(!r.ok){if(retryableStatus(r.status)){transientFailures+=1;const delay=retryAfterMs(r,1500*transientFailures);report('poll-http-retry',{attempt:attempt+1,attempts,httpStatus:r.status,delayMs:delay});if(transientFailures<=5){await sleep(delay);continue;}}const data=await readJson(r);throw Error(data.error||'Could not read AI video generation status.');}
    transientFailures=0;
    const state=await readJson(r);
    report(String(state.status||'processing').toLowerCase(),{attempt:attempt+1,attempts,taskId:task.id});
    if(state.status==='SUCCEEDED'){
      const media=await fetch(`/api/video?id=${encodeURIComponent(task.id)}&download=1`);
      if(!media.ok){if(retryableStatus(media.status)&&attempt<attempts-1){const delay=retryAfterMs(media,1500);report('download-retry',{attempt:attempt+1,httpStatus:media.status,delayMs:delay});await sleep(delay);continue;}throw Error('Runway completed, but the generated video could not be downloaded.');}
      const blob=await media.blob();if(!blob.size)throw Error('Runway returned an empty generated video.');
      const model=state.routing?.model||state.model||media.headers.get('x-bikeztagram-model')||'gen4.5';
      const routed=Boolean(state.routing?.model||state.routing?.configId||media.headers.get('x-bikeztagram-provider')==='runway-model-router');
      const elapsedMs=Date.now()-startedAt;
      onProgress?.(100);report('ready',{attempt:attempt+1,attempts,taskId:task.id,elapsedMs});
      return{blob,videoBlob:blob,sourceUrl:'',url:'',source:routed?'runway-model-router':`runway-${model}`,status:'ready',duration:state.duration||duration,mimeType:blob.type||'video/mp4',provider:routed?`Runway Model Router (${model})`:'Runway Gen-4.5',model,mode:promptImage?'image-to-video':'text-to-video',routing:state.routing||null,taskId:task.id,pollAttempts:attempt+1,elapsedMs};
    }
    if(state.status==='FAILED'||state.status==='CANCELED'){report(String(state.status).toLowerCase(),{attempt:attempt+1,attempts,taskId:task.id});throw Error(`Runway video generation ${String(state.status).toLowerCase()}.`);}
    onProgress?.(Math.min(95,Math.round((attempt+1)/attempts*95)));
  }
  report('timeout',{attempts,taskId:task.id});
  throw Error(`AI video generation timed out after ${attempts} polling attempts.`);
}
