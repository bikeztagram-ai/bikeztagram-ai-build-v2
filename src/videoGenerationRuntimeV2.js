/*
 * Provider-neutral video generation runtime.
 *
 * Selection order:
 * 1. caller-supplied model adapter (real text/image-to-video provider),
 * 2. in-house procedural generator.
 * This keeps the Creative Engine independent from any single vendor.
 */
import { createVideoGenerationRequest } from './videoGenerationV2.js';
import { generateProceduralSceneV2 } from './proceduralSceneGeneratorV2.js';

export function createVideoGenerationRuntime({modelAdapter=null,localGenerator=generateProceduralSceneV2}={}){
 return {
  async generate(requestInput={},context={}){
   const request=createVideoGenerationRequest(requestInput);
   if(typeof modelAdapter==='function'){
    const modelResult=await modelAdapter(request,context);
    if(modelResult?.videoUrl||modelResult?.videoBlob||modelResult?.blob)return {...modelResult,request,source:modelResult.source||'model',status:'ready'};
   }
   if(typeof localGenerator!=='function')return {request,source:null,status:'unavailable'};
   const local=await localGenerator({
    prompt:request.prompt,
    purpose:request.timelineRole,
    duration:request.duration,
    title:context.title||'',
    onProgress:context.onProgress,
   });
   return {...local,request,source:'local-procedural',status:'ready',identityPreserved:Boolean(request.constraints?.preserveSubjectIdentity)};
  }
 };
}

export async function generateVideoSceneV2(request,context={},runtime=createVideoGenerationRuntime()){
 return runtime.generate(request,context);
}
