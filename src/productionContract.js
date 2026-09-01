/* Production pipeline contract — keeps the app model/provider agnostic. */
export const PRODUCTION_STAGES=['understand','direct','music','scenes','assemble','render','qa','revise','export'];
export const PRODUCTION_RULES={realFootageFirst:true,generatedInsertsOptional:true,noGeminiRuntime:true,originalAudioOnlyByDefault:true,copyrightSafeGeneration:true,identityPreservation:true,maxRevisionAttempts:3};
export function stageSummary(stage,status='planned',message=''){return{id:stage,status,message,at:new Date().toISOString()};}
