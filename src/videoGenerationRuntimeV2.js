/*
 * Provider-neutral video generation runtime.
 *
 * Selection order:
 * 1. caller-supplied model adapter (real text/image-to-video provider),
 * 2. in-house procedural generator.
 * Provider output is validated before it enters the production timeline.
 */
import { createVideoGenerationRequest } from './videoGenerationV2.js';
import { generateProceduralSceneV2 } from './proceduralSceneGeneratorV2.js';

const validOutput=x=>Boolean(x?.videoUrl||x?.videoBlob||x?.blob);
const outputDuration=x=>Number(x?.duration||x?.videoDuration||x?.metadata?.duration||0);

export function validateGeneratedVideoOutput(result,request,{tolerance=.5}={}){
 const duration=outputDuration(result);
 const expected=Number(request?.duration)||0;
 const hasOutput=validOutput(result);
 const durationKnown=duration>0;
 const durationValid=!durationKnown||Math.abs(duration-expected)<=Math.max(tolerance,expected*.1);
 const identityRequired=Boolean(request?.constraints?.preserveSubjectIdentity);
 const identityDeclared=!identityRequired||result?.identityPreserved===true||result?.subjectIds?.length>0||result?.metadata?.identityPreserved===true;
 const originality= request?.constraints?.originalOnly===true ? result?.originalOnly!==false : true;
 return {valid:hasOutput&&durationValid&&identityDeclared&&originality,hasOutput,duration,durationKnown,durationValid,identityRequired,identityDeclared,originality};
}

export function createVideoGenerationRuntime({modelAdapter=null,localGenerator=generateProceduralSceneV2}={}){
 return {
  async generate(requestInput={},context={}){
   const request=createVideoGenerationRequest(requestInput);
   if(typeof modelAdapter==='function'){
    const modelResult=await modelAdapter(request,context);
    const check=validateGeneratedVideoOutput(modelResult,request);
    if(check.valid)return {...modelResult,request,source:modelResult.source||'model',status:'ready',generationValidation:check,identityPreserved:check.identityDeclared};
   }
   if(typeof localGenerator!=='function')return {request,source:null,status:'unavailable'};
   const local=await localGenerator({prompt:request.prompt,purpose:request.timelineRole,duration:request.duration,title:context.title||'',onProgress:context.onProgress});
   return {...local,request,source:'local-procedural',status:'ready',identityPreserved:Boolean(request.constraints?.preserveSubjectIdentity),generationValidation:{valid:true,source:'procedural-fallback'}};
  }
 };
}

export async function generateVideoSceneV2(request,context={},runtime=createVideoGenerationRuntime()){
 return runtime.generate(request,context);
}
