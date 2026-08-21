/* Execution boundary for Wan 2.2 TI2V-5B.
 * Wan's official repo documents T2V/I2V and TI2V-5B at 720p; execution stays outside the web bundle.
 */
export function createWan22Runner({execute=null,modelId='Wan-AI/Wan2.2-TI2V-5B'}={}){
 return {version:'wan22-runner-v1',modelId,async generate(request){if(typeof execute!=='function')return {status:'runtime-required',reason:'local-runner-not-configured',modelId,request};return execute({modelId,request});}};
}
export function normaliseVideoGeneration(result={}){return {status:result.status||'generated',videoUrl:result.videoUrl||result.url||null,duration:Number(result.duration)||0,width:Number(result.width)||null,height:Number(result.height)||null,fps:Number(result.fps)||24,modelId:result.modelId||'Wan-AI/Wan2.2-TI2V-5B',subjectIds:Array.isArray(result.subjectIds)?result.subjectIds:[],continuityKey:result.continuityKey||null};}
