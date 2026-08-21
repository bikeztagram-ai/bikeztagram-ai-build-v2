/* Runs a fixed matrix through an injected adapter; model execution stays outside the browser. */
export const BENCHMARK_MATRIX=[
 {id:'subject-animation',capability:'image-to-video'},
 {id:'world-generation',capability:'text-to-video'},
 {id:'multi-subject',capability:'image-to-video'},
 {id:'prompt-fidelity',capability:'text-to-video'},
 {id:'music-generation',capability:'text-to-music'}
];
export async function executeBenchmarkMatrix({adapter,cases=BENCHMARK_MATRIX,runner}){const results=[];for(const test of cases){const started=Date.now();try{const output=await runner(adapter,test);results.push({id:test.id,capability:test.capability,status:'complete',elapsedMs:Date.now()-started,output});}catch(error){results.push({id:test.id,capability:test.capability,status:'failed',elapsedMs:Date.now()-started,error:String(error)});}}return {version:'model-benchmark-execution-v1',modelId:adapter.id,results};}
