/* Cinematic treatment engine — converts creative intent + media facts into safe,
   executable shot treatments. Pure and deterministic so the browser can use it
   without an AI round-trip. */
const t=v=>String(v??'').toLowerCase();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const has=(s,...words)=>words.some(w=>s.includes(w));

function treatmentFor({role='',subjectType='unknown',prompt='',index=0,total=1}={}){
 const p=t(prompt), roleText=t(role), subject=t(subjectType);
 const first=index===0,last=index===total-1;
 if(first)return {motion:has(p,'slow','moody')?'slow-push-in':'push-in',transition:'hard-cut',composition:'strongest readable subject',intensity:'hook'};
 if(last)return {motion:'gentle-push',transition:'fade',composition:'clean hero framing',intensity:'resolution'};
 if(has(roleText,'action')||has(p,'action','speed','race','chase'))return {motion:'speed-ramp',transition:'impact-cut',composition:subject==='vehicle'?'low-angle tracking':'forward motion emphasis',intensity:'high'};
 if(has(roleText,'reveal','hero')||has(p,'reveal','showcase','launch'))return {motion:'slow-orbit',transition:'match-cut',composition:subject==='vehicle'?'three-quarter hero':'subject-first',intensity:'rising'};
 if(has(roleText,'build','variation')||has(p,'cinematic','trailer'))return {motion:index%2?'lateral-pan':'slow-push',transition:'rhythmic-cut',composition:index%2?'environmental context':'medium detail',intensity:'build'};
 return {motion:'subtle-drift',transition:'clean-cut',composition:'natural framing',intensity:'controlled'};
}

export function buildCinematicTreatments({moments=[],creativePrompt='',targetDuration=15}={}){
 const items=Array.isArray(moments)?moments:[];
 const total=items.length;
 const budget=Math.max(1,Number(targetDuration)||15);
 const raw=items.map((moment,index)=>{
   const role=moment.editorialRole|| (index===0?'hook':index===total-1?'hero':'variation');
   const subjectType=moment.directorSubjectFamily||moment.subjectType||moment.subjectCategory||'unknown';
   const duration=Math.max(.5,Math.min(6,Number(moment.duration)||Math.min(2.5,budget/Math.max(1,total))));
   return {...moment,cinematicTreatment:treatmentFor({role,subjectType,prompt:creativePrompt,index,total}),treatmentDuration:duration,treatmentIndex:index};
 });
 const totalDuration=raw.reduce((sum,m)=>sum+Number(m.treatmentDuration||0),0);
 const scale=totalDuration>budget?budget/totalDuration:1;
 return {version:'cinematic-treatment-v1',targetDuration:budget,totalDuration:Number((totalDuration*scale).toFixed(2)),items:raw.map(m=>({...m,treatmentDuration:Number((m.treatmentDuration*scale).toFixed(2))}))};
}
