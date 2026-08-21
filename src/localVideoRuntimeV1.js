/* Local/open video runtime boundary. No provider is hard-coded here. */
export function createLocalVideoRuntime({modelId='auto',available=false,generate=null}={}){
 return {version:'local-video-runtime-v1',modelId,available,async generateScene(request){if(!available||typeof generate!=='function')return {status:'fallback-required',reason:'local-model-unavailable',request};return generate(request);}};
}
export function normaliseVideoResult(result={}){return {status:result.status||'generated',videoUrl:result.videoUrl||null,duration:Number(result.duration)||0,width:Number(result.width)||null,height:Number(result.height)||null,subjectIds:Array.isArray(result.subjectIds)?result.subjectIds:[],continuityKey:result.continuityKey||null,modelId:result.modelId||null};}
