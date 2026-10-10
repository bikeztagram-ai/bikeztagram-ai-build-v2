import { generateFromHuggingFaceSpace } from './huggingFaceVideoProvider.js';
import { createVideoCacheKey, getCachedVideo, putCachedVideo } from './videoGenerationCache.js';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const retryableStatus=status=>status===408||status===425||status===429||status>=500;
async function readJson(response){try{return await response.json()}catch{return{}}}
export async function getVideoProviderCapabilities(){
  const response=await fetch('/api/video',{headers:{Accept:'application/json', 'Cache-Control':'no-cache'}});
  if(!response.ok)throw new Error('Could not check video provider readiness.');
  return response.json();
}
export async function generateAIVideoScene({prompt,duration=5,ratio='720:1280',promptImage='',provider='auto',dryRun=false,allowPaidVideo=false,onProgress}={}){
  const capabilities=await getVideoProviderCapabilities();
  const free=capabilities?.providers?.huggingfaceSpace;
  const useFree=(provider==='auto'||provider==='huggingface')&&Boolean(free?.configured&&free?.url);
  if(provider==='huggingface'&&!useFree)throw new Error('The free Hugging Face video Space is not connected yet. Configure HF_VIDEO_SPACE_URL in Vercel after deploying the Space.');
  const selectedProvider = useFree ? `huggingface-zerogpu-wan:${free.url}:${free.apiName || '/generate_video'}` : 'runway-gen4.5';
  if(!useFree&&!allowPaidVideo)throw new Error('No free AI video provider is connected. Paid Runway generation is disabled unless you explicitly opt in. Your prompt and photos were not sent to a paid provider.');
  if(dryRun)return{status:'dry-run',provider:useFree?'Hugging Face ZeroGPU (Wan 2.2 TI2V 5B)':'Runway Gen-4.5',mode:promptImage?'image-to-video':'text-to-video'};
  const cacheKey = await createVideoCacheKey({provider:selectedProvider,prompt,duration,ratio,promptImage});
  const cached = await getCachedVideo(cacheKey);
  if(cached){onProgress?.(100);return{...(cached.metadata||{}),blob:cached.blob,videoBlob:cached.blob,status:'ready',cached:true};}
  if(useFree){
    const generated = await generateFromHuggingFaceSpace({spaceUrl:free.url,apiName:free.apiName,prompt,duration,promptImage,onProgress});
    const {blob,videoBlob,...metadata}=generated;
    await putCachedVideo(cacheKey,blob,metadata);
    return generated;
  }
  const start=await fetch('/api/video',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,duration,ratio,promptImage:promptImage||undefined,provider:'runway',dryRun:Boolean(dryRun),allowPaid:true})});
  if(!start.ok){const data=await readJson(start);throw Error(data.error||'AI video generation could not start.');}
  const task=await readJson(start);
  if(dryRun)return{status:'dry-run',provider:start.headers.get('x-bikeztagram-provider')||'runway-gen4.5',routing:task.routing||null,task};
  if(!task?.id)throw Error('Runway did not return a generation task id.');
  let transientFailures=0;
  for(let attempt=0;attempt<30;attempt++){
    await sleep(attempt?5000:2000);
    let r;
    try{r=await fetch(`/api/video?id=${encodeURIComponent(task.id)}`)}catch(error){transientFailures+=1;if(transientFailures>4)throw Error(`Could not read AI video generation status: ${error?.message||String(error)}`);await sleep(1500*transientFailures);continue;}
    if(!r.ok){if(retryableStatus(r.status)){transientFailures+=1;if(transientFailures<=4){await sleep(1500*transientFailures);continue;}}const data=await readJson(r);throw Error(data.error||'Could not read AI video generation status.');}
    transientFailures=0;
    const state=await readJson(r);
    if(state.status==='SUCCEEDED'){
      const media=await fetch(`/api/video?id=${encodeURIComponent(task.id)}&download=1`);
      if(!media.ok){if(retryableStatus(media.status)&&attempt<29){await sleep(1500);continue;}throw Error('Runway completed, but the generated video could not be downloaded.');}
      const blob=await media.blob();if(!blob.size)throw Error('Runway returned an empty generated video.');
      const model=state.routing?.model||state.model||media.headers.get('x-bikeztagram-model')||'gen4.5';
      const routed=Boolean(state.routing?.model||state.routing?.configId||media.headers.get('x-bikeztagram-provider')==='runway-model-router');
      onProgress?.(100);
      const generated={blob,videoBlob:blob,source:routed?'runway-model-router':`runway-${model}`,status:'ready',duration:state.duration||duration,mimeType:blob.type||'video/mp4',provider:routed?`Runway Model Router (${model})`:'Runway Gen-4.5',model,mode:promptImage?'image-to-video':'text-to-video',routing:state.routing||null};
      const {blob:cachedBlob,videoBlob:cachedVideo,...metadata}=generated;
      await putCachedVideo(cacheKey,cachedBlob,metadata);
      return generated;
    }
    if(state.status==='FAILED'||state.status==='CANCELED')throw Error(`Runway video generation ${String(state.status).toLowerCase()}.`);
    onProgress?.(Math.min(95,Math.round((attempt+1)/30*95)));
  }
  throw Error('AI video generation timed out while waiting for Runway.');
}
