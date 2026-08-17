/* Turn a source project into platform-aware short-form candidates. */
export function buildRepurposePlan(project={}, moments=[], platforms=['reels','tiktok','shorts']) {
  const ranked=[...moments].sort((a,b)=>(b.score||0)-(a.score||0));
  return platforms.flatMap(platform=>ranked.slice(0,10).map((moment,index)=>({id:`${platform}-${moment.id||index}`,platform,sourceMomentId:moment.id||null,hook:moment.hook||null,score:moment.score||0,format:'vertical',status:'candidate'})));
}
