/*
 * Execution boundary for Stability's Stable Audio Open Small.
 * The browser/app never downloads or executes model weights directly.
 * A local worker/service implements `execute` and returns a WAV artifact.
 */
export function createStableAudioOpenRunner({execute=null,modelId='stabilityai/stable-audio-open-small'}={}){
 return {version:'stable-audio-open-runner-v1',modelId,async generate(request){if(typeof execute!=='function')return {status:'runtime-required',reason:'local-runner-not-configured',modelId,request};return execute({modelId,request});}};
}
export function normaliseAudioGeneration(result={}){return {status:result.status||'generated',audioUrl:result.audioUrl||result.url||null,duration:Number(result.duration)||0,sampleRate:Number(result.sampleRate)||44100,channels:Number(result.channels)||2,modelId:result.modelId||'stabilityai/stable-audio-open-small',events:Array.isArray(result.events)?result.events:[]};}
