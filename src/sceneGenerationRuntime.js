/* Provider-neutral scene runtime. It compiles creative scene intent into an executable
   browser-safe scene job and keeps local procedural fallback separate from external models. */
const text=v=>String(v??'').trim();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
export function compileSceneGenerationRequest({prompt='',sceneType='cinematic',duration=4,aspectRatio='9:16',subjectRefs=[]}={}){return{version:'scene-generation-request-v1',prompt:text(prompt)||'Generate an original cinematic scene.',sceneType:text(sceneType)||'cinematic',duration:clamp(duration,.5,30),aspectRatio:text(aspectRatio)||'9:16',subjectRefs:Array.isArray(subjectRefs)?subjectRefs.filter(Boolean):[],original:true,providerSlots:{externalModel:true,localProceduralFallback:true},constraints:{noNamedWorkImitation:true,preserveSubjectRefs:true}};}
export function chooseSceneRuntime({providerAvailable=false,preferLocal=false}={}){return preferLocal||!providerAvailable?'local-procedural':'external-provider';}
export function buildSceneTimeline(requests=[]){return(Array.isArray(requests)?requests:[]).map((r,i)=>({...r,id:r.id||`generated-scene-${i+1}`,startTime:Number((Array.from({length:i},(_,j)=>Number(requests[j]?.duration||0)).reduce((a,b)=>a+b,0)).toFixed(3)),source:'generated',runtime:chooseSceneRuntime(r)}));}
