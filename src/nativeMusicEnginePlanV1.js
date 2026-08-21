/* Bikeztagram-owned music pipeline. External/open weights are replaceable inference components, not the product API. */
const STAGES=['brief','composition','generation','structure','events','variation','mix','qa','revision','export'];
export function createNativeMusicJob({prompt='',duration=30,genre='',mood='',bpm=null}={}){return {version:'native-music-job-v1',prompt,duration,genre,mood,bpm,stages:STAGES.map(stage=>({stage,status:'pending'})),candidates:[],selected:null,events:[],revisions:0};}
export function musicJobRequirements(job){return {original:true,structured:true,editable:true,eventTimeline:true,targetDuration:job.duration,style:{genre:job.genre,mood:job.mood},bpm:job.bpm};}
export function markMusicStage(job,stage,status='complete',output=null){return {...job,stages:job.stages.map(s=>s.stage===stage?{...s,status,output}:s)};}
