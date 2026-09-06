/* Server-side Runway video gateway. No Gemini. Direct Gen-4.5 remains the safe default; an optional Model Router can select among eligible non-Gemini models. */
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const SUPPORTED_RATIOS=['1280:720','720:1280','1584:672','1104:832','832:1104','672:1584','960:960'];
const aspectRatio=(ratio)=>{const [w,h]=String(ratio).split(':').map(Number);if(!w||!h)return'9:16';if(Math.abs(w/h-1)<.05)return'1:1';return w>h?'16:9':'9:16';};
const routerConfig=()=>String(process.env.RUNWAY_VIDEO_ROUTER_CONFIG_ID||'').trim();
const useRouter=()=>Boolean(routerConfig());
async function startDirect({key,prompt,duration,ratio,promptImage}){
  const payload={model:'gen4.5',promptText:prompt,ratio,duration};
  if(promptImage)payload.promptImage=String(promptImage);
  return fetch('https://api.dev.runwayml.com/v1/image_to_video',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`,'X-Runway-Version':'2024-11-06'},body:JSON.stringify(payload)});
}
async function startRouted({key,prompt,duration,ratio,promptImage,dryRun=false}){
  const input={promptText:prompt,aspectRatio:aspectRatio(ratio),duration};
  if(promptImage)input.referenceImages=[{uri:String(promptImage),role:'first'}];
  return fetch('https://api.dev.runwayml.com/v1/generate/video',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`,'X-Runway-Version':'2024-11-06'},body:JSON.stringify({configId:routerConfig(),dryRun:Boolean(dryRun),input})});
}
export default async function handler(req){
  const key=process.env.RUNWAYML_API_SECRET; if(!key)return json({error:'AI video provider is not configured. Add RUNWAYML_API_SECRET in Vercel.'},503);
  try{
    if(req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body||{};
      const prompt=String(body.prompt||'').trim(); if(!prompt)return json({error:'Video prompt is required.'},400);
      const duration=Math.max(2,Math.min(10,Number(body.duration)||5));
      const requestedRatio=String(body.ratio||'720:1280'); const ratio=SUPPORTED_RATIOS.includes(requestedRatio)?requestedRatio:'720:1280';
      const routed=useRouter() && body.provider!=='gen4.5';
      const response=routed?await startRouted({key,prompt,duration,ratio,promptImage:body.promptImage,dryRun:Boolean(body.dryRun)}):await startDirect({key,prompt,duration,ratio,promptImage:body.promptImage});
      const text=await response.text();
      if(!response.ok)return new Response(text||JSON.stringify({error:routed?'Runway routed video generation failed.':'Runway task creation failed.'}),{status:response.status,headers:{'content-type':response.headers.get('content-type')||'application/json'}});
      return new Response(text,{status:200,headers:{'content-type':'application/json','cache-control':'no-store','x-bikeztagram-provider':routed?'runway-model-router':'runway-gen4.5'}});
    }
    if(req.method==='GET'){
      const url=new URL(req.url,'http://localhost'); const id=url.searchParams.get('id'); const download=url.searchParams.get('download')==='1'; if(!id)return json({error:'Task id is required.'},400);
      const response=await fetch(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`,'X-Runway-Version':'2024-11-06'}});
      const text=await response.text(); if(!response.ok)return new Response(text,{status:response.status,headers:{'content-type':response.headers.get('content-type')||'application/json','cache-control':'no-store'}});
      const state=JSON.parse(text);
      if(!download||state.status!=='SUCCEEDED')return json(state,response.status);
      const output=Array.isArray(state.output)?state.output[0]:state.output; if(!output)return json({error:'Runway completed without a video output.'},502);
      const media=await fetch(output); if(!media.ok)return json({error:'Runway output could not be downloaded.',providerStatus:media.status},502);
      const routed=Boolean(state.routing?.model||state.routing?.configId);
      return new Response(await media.arrayBuffer(),{status:200,headers:{'content-type':media.headers.get('content-type')||'video/mp4','cache-control':'no-store','content-disposition':'inline; filename="bikeztagram-ai-generated.mp4"','x-bikeztagram-provider':routed?'runway-model-router':(state.model||'runway-gen4.5'),'x-bikeztagram-model':String(state.routing?.model||state.model||'unknown')});
    }
    return json({error:'Method not allowed.'},405);
  }catch(error){return json({error:'AI video provider request failed.',details:error?.message||String(error)},502);}
}
