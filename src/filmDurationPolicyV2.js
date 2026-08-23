const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
export function resolveFilmDuration({requestedDuration,prompt='',mediaCount=0}={}){
  const p=String(prompt).toLowerCase();
  if(Number.isFinite(Number(requestedDuration)))return clamp(requestedDuration,15,3600);
  const sec=p.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:sec|secs|second|seconds)(?:\s|$)/);
  if(sec)return clamp(Number(sec[1]),15,3600);
  const min=p.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)(?:\s|$)/);
  if(min)return clamp(Number(min[1])*60,15,3600);
  const hour=p.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours)(?:\s|$)/);
  if(hour)return clamp(Number(hour[1])*3600,15,3600);
  if(/feature|full length/.test(p))return 1800;
  if(/long|full film|documentary|extended/.test(p))return mediaCount>3?1200:600;
  return 15;
}
export function buildDurationPolicy({duration=15}={}){const d=clamp(duration,15,3600);return {duration:d,short:d<=35,medium:d>35&&d<=180,long:d>180,veryLong:d>900,compositionRequired:d>35,sectionDevelopment:d>35,multiSectionMusic:d>35,rendererMustSupportContinuousTimeline:true,providerMayNeedExtension:d>180};}
