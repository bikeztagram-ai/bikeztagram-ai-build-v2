/* Server-side Runway Gen-4.5 gateway. Secrets stay server-side; generated output is proxied into the browser. */
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async function handler(req){
  const key=process.env.RUNWAYML_API_SECRET;
  if(!key)return json({error:'AI video provider is not configured. Add RUNWAYML_API_SECRET in Vercel.'},503);
  try{
    if(req.method==='POST'){
      const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body||{};
      const prompt=String(body.prompt||'').trim();
      if(!prompt)return json({error:'Video prompt is required.'},400);
      const duration=Math.max(2,Math.min(10,Number(body.duration)||5));
      const requestedRatio=String(body.ratio||'720:1280');
      const ratio=['1280:720','720:1280','1584:672','1104:832','832:1104','672:1584','960:960'].includes(requestedRatio)?requestedRatio:'720:1280';
      const payload={model:'gen4.5',promptText:prompt,ratio,duration};
      if(body.promptImage)payload.promptImage=String(body.promptImage);
      const response=await fetch('https://api.dev.runwayml.com/v1/image_to_video',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`,'X-Runway-Version':'2024-11-06'},body:JSON.stringify(payload)});
      const text=await response.text();
      if(!response.ok)return new Response(text||JSON.stringify({error:'Runway task creation failed.'}),{status:response.status,headers:{'content-type':response.headers.get('content-type')||'application/json'}});
      return new Response(text,{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}});
    }
    if(req.method==='GET'){
      const url=new URL(req.url,'http://localhost');
      const id=url.searchParams.get('id');
      const download=url.searchParams.get('download')==='1';
      if(!id)return json({error:'Task id is required.'},400);
      const response=await fetch(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`,'X-Runway-Version':'2024-11-06'}});
      const text=await response.text();
      if(!response.ok)return new Response(text,{status:response.status,headers:{'content-type':response.headers.get('content-type')||'application/json','cache-control':'no-store'}});
      const state=JSON.parse(text);
      if(!download||state.status!=='SUCCEEDED')return json(state,response.status);
      const output=Array.isArray(state.output)?state.output[0]:state.output;
      if(!output)return json({error:'Runway completed without a video output.'},502);
      const media=await fetch(output);
      if(!media.ok)return json({error:'Runway output could not be downloaded.',providerStatus:media.status},502);
      return new Response(await media.arrayBuffer(),{status:200,headers:{'content-type':media.headers.get('content-type')||'video/mp4','cache-control':'no-store','content-disposition':'inline; filename="bikeztagram-ai-generated.mp4"','x-bikeztagram-provider':'runway-gen4.5'}});
    }
    return json({error:'Method not allowed.'},405);
  }catch(error){return json({error:'AI video provider request failed.',details:error?.message||String(error)},502);}
}
