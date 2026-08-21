/* Connects universal generation requests to capability-based runtime adapters. */
export function resolveGenerationAdapter(request,{musicRuntime=null,videoRuntime=null}={}){
 const audio=['music-video'].includes(request?.type)||request?.audio?.generate===true;
 if(audio&&musicRuntime)return {kind:'music',runtime:musicRuntime};
 if(videoRuntime)return {kind:'video',runtime:videoRuntime};
 return {kind:'fallback',runtime:null};
}
export async function executeGenerationRequest(request,adapters={}){
 const resolved=resolveGenerationAdapter(request,adapters);
 if(!resolved.runtime)return {status:'fallback-required',request};
 if(resolved.kind==='music')return resolved.runtime.generateMusic(request);
 return resolved.runtime.generateScene(request);
}
