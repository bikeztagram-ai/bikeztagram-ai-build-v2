/* Server-side Runway video gateway. No Gemini. Direct Gen-4.5 remains the safe default; an optional Model Router can select among eligible non-Gemini models. */
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
// Bound provider network waits so a stalled upstream cannot occupy a Vercel function for its full runtime ceiling.
const fetchWithTimeout=(input,init={},timeoutMs=20000)=>fetch(input,{...init,signal:init.signal||AbortSignal.timeout(timeoutMs)});
const SUPPORTED_RATIOS=['1280:720','720:1280','1584:672','1104:832','832:1104','672:1584','960:960'];
const aspectRatio=(ratio)=>{const [w,h]=String(ratio).split(':').map(Number);if(!w||!h)return'9:16';if(Math.abs(w/h-1)<.05)return'1:1';return w>h?'16:9':'9:16';};
const routerConfig=()=>String(process.env.RUNWAY_VIDEO_ROUTER_CONFIG_ID||'').trim();
const useRouter=()=>Boolean(routerConfig());
const forbiddenModel=(model)=>/gemini/i.test(String(model||''));
async function startDirect({key,prompt,duration,ratio,promptImage}){
  const payload={model:'gen4.5',promptText:prompt,ratio,duration};
  if(promptImage)payload.promptImage=String(promptImage);
  return fetchWithTimeout('https://api.dev.runwayml.com/v1/image_to_video',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`,'X-Runway-Version':'2024-11-06'},body:JSON.stringify(payload)});
}
async function routedRequest({key,prompt,duration,ratio,promptImage,dryRun=false}){
  const input={promptText:prompt,aspectRatio:aspectRatio(ratio),duration};
  if(promptImage)input.referenceImages=[{uri:String(promptImage),role:'first'}];
  return fetchWithTimeout('https://api.dev.runwayml.com/v1/generate/video',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`,'X-Runway-Version':'2024-11-06'},body:JSON.stringify({configId:routerConfig(),dryRun:Boolean(dryRun),input})});
}
async function startRouted(args){
  const preview=await routedRequest({...args,dryRun:true});
  const previewText=await preview.text();
  if(!preview.ok)return new Response(previewText||JSON.stringify({error:'Runway Model Router dry-run failed.'}),{status:preview.status,headers:{'content-type':preview.headers.get('content-type')||'application/json'}});
  let routing={};try{routing=JSON.parse(previewText)||{}}catch{routing={};}
  const selected=routing?.routing?.model||routing?.model||'';
  if(forbiddenModel(selected))return new Response(JSON.stringify({error:'The configured Runway video router selected a forbidden Gemini model. Reconfigure the router to exclude all Gemini models.'}),{status:409,headers:{'content-type':'application/json','cache-control':'no-store'}});
  if(args.dryRun)return new Response(previewText,{status:200,headers:{'content-type':'application/json','cache-control':'no-store','x-bikeztagram-provider':'runway-model-router'}});
  return routedRequest({...args,dryRun:false});
}
export default async function handler(req){
  try{
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && !url.searchParams.has('id')) {
      return json({
        providers: {
          runway: { configured: Boolean(process.env.RUNWAYML_API_SECRET), paid: true, requiresExplicitConsent: true, model: 'gen4.5' },
          huggingfaceSpace: { configured: Boolean(process.env.HF_VIDEO_SPACE_URL), paid: false, url: String(process.env.HF_VIDEO_SPACE_URL || '').trim().replace(/\/+$/, ''), apiName: String(process.env.HF_VIDEO_API_NAME || '/generate_video').trim(), model: 'Wan 2.2 TI2V 5B', note: 'Uses the configured public Gradio Space and its ZeroGPU quota.' }
        },
        defaultProvider: process.env.HF_VIDEO_SPACE_URL ? 'huggingface-zerogpu' : 'none',
        policy: 'No paid generation starts unless allowPaid is explicitly true.'
      });
    }
    const key=process.env.RUNWAYML_API_SECRET;
    if(!key)return json({error:'No AI video provider is configured. The free procedural renderer remains available; no paid request was made.'},503);
    if(req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body||{};
      if (body.provider === 'huggingface') return json({ error: 'The Hugging Face provider adapter is not connected yet. No generation was started.' }, 501);
      if (body.allowPaid !== true) return json({ error: 'Paid AI video is locked. Explicitly enable the paid-generation option before starting Runway; no charge was initiated.' }, 402);
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
      const response=await fetchWithTimeout(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`,'X-Runway-Version':'2024-11-06'}});
      const text=await response.text(); if(!response.ok)return new Response(text,{status:response.status,headers:{'content-type':response.headers.get('content-type')||'application/json','cache-control':'no-store'}});
      const state=JSON.parse(text);
      const selected=state.routing?.model||state.model||'';
      if(forbiddenModel(selected))return json({error:'Forbidden Gemini video model detected; Bikeztagram AI will not accept Gemini output.'},409);
      if(!download||state.status!=='SUCCEEDED')return json(state,response.status);
      const output=Array.isArray(state.output)?state.output[0]:state.output; if(!output)return json({error:'Runway completed without a video output.'},502);
      const media=await fetchWithTimeout(output,{},60000); if(!media.ok)return json({error:'Runway output could not be downloaded.',providerStatus:media.status},502);
      const routed=Boolean(state.routing?.model||state.routing?.configId);
      return new Response(await media.arrayBuffer(),{status:200,headers:{'content-type':media.headers.get('content-type')||'video/mp4','cache-control':'no-store','content-disposition':'inline; filename="bikeztagram-ai-generated.mp4"','x-bikeztagram-provider':routed?'runway-model-router':(state.model||'runway-gen4.5'),'x-bikeztagram-model':String(state.routing?.model||state.model||'unknown')}});
    }
    return json({error:'Method not allowed.'},405);
  }catch(error){return json({error:'AI video provider request failed.',details:error?.message||String(error)},502);}
}
