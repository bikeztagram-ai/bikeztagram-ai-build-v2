/* Local-first music runtime. The adapter boundary lets an actual open model be plugged in without changing Creative Director/editor contracts. */
export function createLocalMusicRuntime({modelId='auto',available=false,generate=null}={}){
 return {version:'local-music-runtime-v1',modelId,available,async generateMusic(request){if(!available||typeof generate!=='function')return {status:'fallback-required',reason:'local-model-unavailable',request};return generate(request);}};
}
export function normaliseMusicResult(result={}){return {status:result.status||'generated',audioUrl:result.audioUrl||null,duration:Number(result.duration)||0,bpm:Number(result.bpm)||null,events:Array.isArray(result.events)?result.events:[],stems:result.stems||{},modelId:result.modelId||null};}
