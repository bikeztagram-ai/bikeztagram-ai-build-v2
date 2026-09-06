const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function generateAIVideoScene({prompt,duration=5,ratio='720:1280',promptImage='',provider='auto',dryRun=false,onProgress}={}){
  const start=await fetch('/api/video',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,duration,ratio,promptImage:promptImage||undefined,provider,dryRun:Boolean(dryRun)})});
  if(!start.ok){let data={};try{data=await start.json()}catch{}if(start.status===503)return null;throw Error(data.error||'AI video generation could not start.');}
  const task=await start.json();
  if(dryRun)return{status:'dry-run',provider:start.headers.get('x-bikeztagram-provider')||'runway-model-router',routing:task.routing||null,task};
  if(!task?.id)throw Error('Runway did not return a generation task id.');
  for(let attempt=0;attempt<30;attempt++){
    await sleep(attempt?5000:2000);
    const r=await fetch(`/api/video?id=${encodeURIComponent(task.id)}`);
    if(!r.ok)throw Error('Could not read AI video generation status.');
    const state=await r.json();
    if(state.status==='SUCCEEDED'){
      const media=await fetch(`/api/video?id=${encodeURIComponent(task.id)}&download=1`);
      if(!media.ok)throw Error('Runway completed, but the generated video could not be downloaded.');
      const blob=await media.blob(); if(!blob.size)throw Error('Runway returned an empty generated video.');
      const model=state.routing?.model||state.model||media.headers.get('x-bikeztagram-model')||'gen4.5';
      const routed=Boolean(state.routing?.model||state.routing?.configId||media.headers.get('x-bikeztagram-provider')==='runway-model-router');
      onProgress?.(100);
      return{blob,videoBlob:blob,sourceUrl:'',url:'',source:routed?'runway-model-router':`runway-${model}`,status:'ready',duration:state.duration||duration,mimeType:blob.type||'video/mp4',provider:routed?`Runway Model Router (${model})`:'Runway Gen-4.5',model,mode:promptImage?'image-to-video':'text-to-video',routing:state.routing||null};
    }
    if(state.status==='FAILED'||state.status==='CANCELED')throw Error(`Runway video generation ${String(state.status).toLowerCase()}.`);
    onProgress?.(Math.min(95,Math.round((attempt+1)/30*95)));
  }
  throw Error('AI video generation timed out while waiting for Runway.');
}
