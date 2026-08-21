/* Bikeztagram-owned video creation pipeline. Model inference is an internal replaceable component. */
const STAGES=['brief','subject-analysis','story','scene-design','generation','continuity','assembly','motion-qa','creative-qa','revision','export'];
export function createNativeVideoJob({prompt='',assets=[],duration=15,aspectRatio='9:16'}={}){return {version:'native-video-job-v1',prompt,assets,duration,aspectRatio,stages:STAGES.map(stage=>({stage,status:'pending'})),scenes:[],generatedAssets:[],revisions:0};}
export function videoGenerationRequirements(job){return {subjectAware:true,worldAware:true,multiScene:true,continuity:true,allowInfill:true,allowTextToVideo:true,allowImageToVideo:true,targetDuration:job.duration,aspectRatio:job.aspectRatio};}
export function markVideoStage(job,stage,status='complete',output=null){return {...job,stages:job.stages.map(s=>s.stage===stage?{...s,status,output}:s)};}
