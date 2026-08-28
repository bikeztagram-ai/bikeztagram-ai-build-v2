/* BIKEZTAGRAM AI — pre-edit shot selector.
   Scores Gemini-verified moments before editorial styling. Never invents media.
   The selector deliberately trades a small amount of raw score for story coverage,
   shot-family diversity, subject diversity, source diversity, temporal separation and duration fit. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const text=v=>String(v||'').toLowerCase();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const describe=m=>text([m.description,m.reason,m.action,m.event,m.editorialRole,m.role,m.purpose,m.intent,m.shotType,m.composition,m.framing,m.cameraAngle].join(' '));
const subject=m=>text(m.subjectRole||m.subject||m.identity||m.subjectLabel||m.subjectCategory);
const sourceKey=m=>String(m.mediaId??m.mediaIndex??'unknown');
const startOf=m=>n(m.start??m.startTime,NaN);
const durationOf=m=>{const explicit=n(m.duration,NaN);if(Number.isFinite(explicit))return clamp(explicit,.5,6);const start=startOf(m);const end=n(m.end??m.endTime,NaN);if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)return clamp(end-start,.5,6);return 2;};
function explicitRole(moment){const raw=[moment?.editorialRole,moment?.role,moment?.purpose,moment?.intent].map(text).find(Boolean)||'';if(/hero|hero-ending|final|ending|resolution/.test(raw))return'hero';if(/hook|opening|intro/.test(raw))return'hook';if(/reveal|unveil|showcase/.test(raw))return'reveal';if(/action|chase|impact|movement/.test(raw))return'action';if(/build|approach|journey|setup/.test(raw))return'build';if(/emotional|emotion|beat/.test(raw))return'emotional';return raw;}
function shotFamily(moment){
 const s=describe(moment);
 if(/extreme close|macro|detail|insert/.test(s))return'detail';
 if(/close-up|close up|portrait|face|headshot/.test(s))return'close';
 if(/wide|establish|landscape|aerial|drone|panorama/.test(s))return'wide';
 if(/medium|mid shot|waist|tracking/.test(s))return'medium';
 if(/action|chase|race|ride|drive|movement|impact|speed/.test(s))return'action';
 if(/overhead|top-down|top down|bird's-eye|birds-eye/.test(s))return'overhead';
 return text(moment.shotType)||'general';
}
function subjectFamily(moment){
 const s=subject(moment);
 if(!s)return'unknown';
 if(/motorcycle|motorbike|bike|vehicle|car|truck|machine/.test(s))return'vehicle';
 if(/person|people|rider|driver|character|face|human|man|woman|child/.test(s))return'person';
 if(/landscape|road|street|city|building|environment|scene|location/.test(s))return'environment';
 return s.slice(0,48);
}
function modes(prompt){const p=text(prompt);return{
 action:/action|fast|race|speed|chase|aggressive|energetic|pursuit|fight|battle/.test(p),
 emotional:/emotional|beautiful|romantic|heartfelt|nostalgic|sentimental/.test(p),
 reveal:/reveal|launch|introduc|unveil|showcase|product/.test(p),
 trailer:/trailer|cinematic|film|movie|teaser|commercial|promo/.test(p),
 dark:/dark|moody|night|dramatic|gritty|noir|mysterious/.test(p),
 game:/game|open world|gaming|interactive/.test(p),
 funny:/funny|comedy|comic|humorous|meme/.test(p)
};}
function scoreMoment(moment,index,total,mode){
 const s=describe(moment); let score=n(moment.score,0)*2;
 if(/hook|opening|establish/.test(s))score+=18;
 if(/reveal|unveil|showcase|profile|detail|close-up|macro/.test(s))score+=12;
 if(/action|movement|moving|speed|race|ride|drive|travel|impact|chase/.test(s))score+=mode.action?20:8;
 if(/emotion|beautiful|sunset|landscape|reaction|smile|laugh/.test(s))score+=mode.emotional?18:7;
 if(/hero|ending|resolution|final/.test(s))score+=15;
 if(index===0)score+=8;
 if(index===total-1)score+=6;
 if(moment.shotType)score+=5;
 if(moment.start!=null||moment.startTime!=null)score+=4;
 if(moment.confidence!=null)score+=n(moment.confidence,.5)*8;
 if(mode.reveal&&/product|vehicle|motorcycle|bike/.test(s))score+=8;
 if(mode.trailer&&/hero|reveal|establish|action/.test(s))score+=5;
 if(mode.game&&/world|environment|vehicle|character|action/.test(s))score+=5;
 const role=explicitRole(moment);if(role)score+=role==='hook'?10:role==='hero'?10:role==='reveal'||role==='action'?8:role==='build'||role==='emotional'?5:0;
 return score;
}
function desiredRole(position,total,mode){
 if(position===0)return'hook';
 if(position===total-1)return'hero';
 const ratio=position/Math.max(1,total-1);
 if(ratio<.34)return'build';
 if(mode.reveal&&ratio<.62)return'reveal';
 if(mode.action&&ratio<.78)return'action';
 if(mode.emotional&&ratio>.55)return'emotional';
 return'variation';
}
function roleBonus(moment,role,mode){
 const s=describe(moment); const explicit=explicitRole(moment);
 if(explicit&&explicit===role)return role==='hook'||role==='hero'?32:26;
 if(explicit&&((role==='hero'&&explicit==='hook')||(role==='hook'&&explicit==='hero')))return-24;
 if(role==='hook')return /hook|opening|establish|impact|action|reveal/.test(s)?24:0;
 if(role==='hero')return /hero|ending|resolution|final|showcase|reveal|portrait|landscape/.test(s)?24:0;
 if(role==='build')return /movement|tracking|journey|road|approach|detail|medium|wide/.test(s)?10:0;
 if(role==='reveal')return /reveal|unveil|showcase|profile|product|vehicle|motorcycle|bike|portrait/.test(s)?18:0;
 if(role==='action')return /action|movement|speed|race|ride|drive|chase|impact/.test(s)?18:0;
 if(role==='emotional')return /emotion|beautiful|sunset|landscape|reaction|smile|laugh|calm/.test(s)?16:0;
 return 0;
}
function durationFit(candidate,usedDuration,targetDuration,remainingSlots){
 const d=durationOf(candidate);const target=Math.max(1,n(targetDuration,15));const remaining=Math.max(0,target-usedDuration);
 let value=0;
 if(remaining>0){const gap=Math.abs(d-Math.min(remaining,3));value+=Math.max(0,8-gap*3);if(d<=remaining+0.75)value+=5;else value-=Math.min(14,(d-remaining)*5);}
 if(remainingSlots===1)value+=Math.max(-12,12-Math.abs((usedDuration+d)-target)*5);
 return value;
}
export function selectDirectorMoments(moments,{maxCuts=8,targetDuration=15,creativePrompt=''}={}){
 if(!Array.isArray(moments)||!moments.length)return[];
 const mode=modes(creativePrompt); const ranked=moments.map((m,i)=>({...m,__directorScore:scoreMoment(m,i,moments.length,mode),__directorIndex:i,__shotFamily:shotFamily(m),__subjectFamily:subjectFamily(m),__duration:durationOf(m)})).sort((a,b)=>b.__directorScore-a.__directorScore);
 const limit=Math.min(Math.max(1,maxCuts),ranked.length);
 const chosen=[]; const usedSources=new Set(); const usedDescriptions=[]; const usedFamilies=new Map(); const usedSubjects=new Map(); let usedDuration=0;
 const similarity=(a,b)=>{const aw=new Set(describe(a).split(/\W+/).filter(x=>x.length>4));const bw=new Set(describe(b).split(/\W+/).filter(x=>x.length>4));let common=0;for(const x of aw)if(bw.has(x))common++;return common/Math.max(1,Math.min(aw.size,bw.size));};
 const temporalDistance=(a,b)=>{const sa=startOf(a),sb=startOf(b);return Number.isFinite(sa)&&Number.isFinite(sb)?Math.abs(sa-sb):Infinity;};
 const ordered=[...ranked];
 while(chosen.length<limit&&ordered.length){let bestIndex=0,best=-Infinity;const role=desiredRole(chosen.length,limit,mode);const remainingSlots=limit-chosen.length;
  for(let i=0;i<ordered.length;i++){
   const m=ordered[i];let value=m.__directorScore+roleBonus(m,role,mode)+durationFit(m,usedDuration,targetDuration,remainingSlots);const source=sourceKey(m);const family=m.__shotFamily;const subjectKey=m.__subjectFamily;
   if(usedSources.has(source))value-=12;
   const familyCount=usedFamilies.get(family)||0;
   if(familyCount)value-=12*familyCount;
   const subjectCount=usedSubjects.get(subjectKey)||0;
   if(subjectKey!=='unknown'&&subjectCount)value-=clamp(9*subjectCount,9,24);
   if(chosen.length&&similarity(m,chosen[chosen.length-1])>.65)value-=18;
   if(usedDescriptions.some(d=>d===describe(m)))value-=30;
   if(chosen.some(c=>temporalDistance(m,c)<1.25))value-=12;
   if(chosen.length===0&&/opening|hook/.test(describe(m)))value+=20;
   if(chosen.length===limit-1&&/hero|ending|resolution/.test(describe(m)))value+=18;
   if(!familyCount&&chosen.length>0)value+=7;
   if(!subjectCount&&subjectKey!=='unknown'&&chosen.length>0)value+=5;
   if(targetDuration>=12&&chosen.length>1){const starts=chosen.map(startOf).filter(Number.isFinite);const candidate=startOf(m);if(Number.isFinite(candidate)&&starts.length){const nearest=Math.min(...starts.map(s=>Math.abs(candidate-s)));if(nearest>Math.max(2,targetDuration/limit))value+=4;}}
   if(value>best){best=value;bestIndex=i;}
  }
  const pick=ordered.splice(bestIndex,1)[0];chosen.push(pick);usedSources.add(sourceKey(pick));usedDescriptions.push(describe(pick));usedFamilies.set(pick.__shotFamily,(usedFamilies.get(pick.__shotFamily)||0)+1);usedSubjects.set(pick.__subjectFamily,(usedSubjects.get(pick.__subjectFamily)||0)+1);usedDuration+=pick.__duration;
 }
 chosen.sort((a,b)=>n(a.start??a.startTime,0)-n(b.start??b.startTime,0));
 if(chosen.length>1){const first=chosen[0];chosen[0]={...first,editorialRole:first.editorialRole||'hook'};const last=chosen[chosen.length-1];chosen[chosen.length-1]={...last,editorialRole:last.editorialRole||'hero-ending'};}
 return chosen.map(({__directorScore,__directorIndex,__shotFamily,__subjectFamily,__duration,...m})=>({...m,directorSelectionScore:Number(__directorScore.toFixed(1)),directorSelectionIndex:__directorIndex,directorShotFamily:shotFamily(m),directorSubjectFamily:subjectFamily(m)}));
}
