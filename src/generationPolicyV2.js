/* Keeps autonomous generation bounded and predictable. */
export function createGenerationPolicy({maxMusicCandidates=4,maxVideoSeconds=60,maxGeneratedScenes=8,maxRevisionAttempts=3,preferLocal=true}={}){
 return {version:'generation-policy-v2',limits:{maxMusicCandidates,maxVideoSeconds,maxGeneratedScenes,maxRevisionAttempts},preferLocal,originalOnly:true,requireCommerciallyEligibleModel:true,allowUnavailableFallback:true};
}
export function approveGenerationRequest(request,policy=createGenerationPolicy(),usage={}){
 const duration=Number(request?.duration)||0;
 const scenes=Number(usage.generatedScenes)||0;
 if(duration>policy.limits.maxVideoSeconds)return {allowed:false,reason:'video-duration-limit'};
 if(scenes>=policy.limits.maxGeneratedScenes&&['text-to-video','image-to-video','subject-scene','infill','insert'].includes(request?.type))return {allowed:false,reason:'generated-scene-limit'};
 if(request?.originalOnly===false)return {allowed:false,reason:'original-only-policy'};
 return {allowed:true,reason:'within-policy'};
}
export function chooseGenerationMode({localAvailable=false,commercialModelAvailable=false,requested='auto'}={}){
 if(requested==='local'||(requested==='auto'&&localAvailable))return 'local';
 if(requested==='remote'||(requested==='auto'&&commercialModelAvailable))return 'eligible-model';
 return 'fallback';
}
