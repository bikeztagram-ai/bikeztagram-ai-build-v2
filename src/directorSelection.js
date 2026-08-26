/* BIKEZTAGRAM AI — pre-edit shot selector.
   Scores Gemini-verified moments before editorial styling. Never invents media.
   Batch 77: prefers visual/story diversity while preserving strong editorial moments. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const text=v=>String(v||'').toLowerCase();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const describe=m=>text([m.description,m.reason,m.action,m.event,m.editorialRole,m.shotType,m.camera,m.composition].join(' '));
const subject=m=>text(m.subjectRole||m.subject||m.identity);

function shotType(moment){
 const explicit=text(moment?.shotType||moment?.shot||moment?.framing);
 if(explicit)return explicit;
 const s=describe(moment);
 if(/extreme close|macro|detail|close-up|close up/.test(s))return'detail';
 if(/medium|waist|mid shot/.test(s))return'medium';
 if(/wide|establish|landscape|panorama|aerial|drone/.test(s))return'wide';
 if(/overhead|top down|bird.?s eye/.test(s))return'overhead';
 if(/tracking|follow|chase|moving shot/.test(s))return'moving';
 if(/portrait|face|person/.test(s))return'portrait';
 return'unknown';
}
function visualBucket(moment){
 const s=describe(moment);
 if(/detail|close-up|macro|close up/.test(s))return'detail';
 if(/wide|landscape|establish|aerial|drone|panorama/.test(s))return'establishing';
 if(/action|movement|moving|speed|race|ride|drive|travel|impact|chase/.test(s))return'action';
 if(/portrait|face|reaction|emotion|smile|laugh/.test(s))return'character';
 if(/reveal|unveil|showcase|hero/.test(s))return'reveal';
 return'cinematic';
}
function scoreMoment(moment,index,total,mode){
 const s=describe(moment);let score=n(moment.score,0)*2;
 if(/hook|opening|establish/.test(s))score+=18;
 if(/reveal|unveil|showcase|profile|detail|close-up|macro/.test(s))score+=12;
 if(/action|movement|moving|speed|race|ride|drive|travel|impact|chase/.test(s))score+=mode.action?20:8;
 if(/emotion|beautiful|sunset|landscape|reaction|smile|laugh/.test(s))score+=mode.emotional?18:7;
 if(/hero|ending|resolution|final/.test(s))score+=15;
 if(index===0)score+=8;if(index===total-1)score+=6;
 if(moment.shotType)score+=5;
 if(moment.start!=null||moment.startTime!=null)score+=4;
 if(moment.confidence!=null)score+=n(moment.confidence,.5)*8;
 return score;
}
function modes(prompt){const p=text(prompt);return{action:/action|fast|race|speed|chase|aggressive|energetic/.test(p),emotional:/emotional|beautiful|romantic|heartfelt|nostalgic/.test(p)};}
function similarity(a,b){
 const aw=new Set(describe(a).split(/\W+/).filter(x=>x.length>4));
 const bw=new Set(describe(b).split(/\W+/).filter(x=>x.length>4));
 let common=0;for(const x of aw)if(bw.has(x))common++;
 return common/Math.max(1,Math.min(aw.size,bw.size));
}

export function selectDirectorMoments(moments,{maxCuts=8,targetDuration=15,creativePrompt=''}={}){
 if(!Array.isArray(moments)||!moments.length)return[];
 const mode=modes(creativePrompt);
 const ranked=moments.map((m,i)=>({...m,__directorScore:scoreMoment(m,i,moments.length,mode),__directorIndex:i,__shotType:shotType(m),__visualBucket:visualBucket(m)})).sort((a,b)=>b.__directorScore-a.__directorScore);
 const limit=Math.min(Math.max(1,maxCuts),ranked.length);
 const chosen=[];const usedSources=new Set();const usedDescriptions=[];const usedShotTypes=new Map();const usedBuckets=new Map();
 const ordered=[...ranked];
 while(chosen.length<limit&&ordered.length){
  let bestIndex=0,best=-Infinity;
  for(let i=0;i<ordered.length;i++){
   const m=ordered[i];let value=m.__directorScore;
   const source=String(m.mediaId??m.mediaIndex??'unknown');
   const type=m.__shotType;const bucket=m.__visualBucket;
   if(usedSources.has(source))value-=10;
   if(chosen.length&&similarity(m,chosen[chosen.length-1])>.65)value-=18;
   if(usedDescriptions.some(d=>d===describe(m)))value-=30;
   const sameType=usedShotTypes.get(type)||0;const sameBucket=usedBuckets.get(bucket)||0;
   if(sameType>=2)value-=10;
   if(sameBucket>=2)value-=8;
   if(chosen.length>1&&type===shotType(chosen[chosen.length-1]))value-=7;
   if(chosen.length===0&&/opening|hook/.test(describe(m)))value+=20;
   if(chosen.length===limit-1&&/hero|ending|resolution/.test(describe(m)))value+=18;
   if(chosen.length===1&&bucket==='establishing')value+=6;
   if(chosen.length>1&&chosen.length<limit-1&&bucket==='action'&&mode.action)value+=5;
   if(value>best){best=value;bestIndex=i;}
  }
  const pick=ordered.splice(bestIndex,1)[0];
  chosen.push(pick);const source=String(pick.mediaId??pick.mediaIndex??'unknown');
  usedSources.add(source);usedDescriptions.push(describe(pick));
  usedShotTypes.set(pick.__shotType,(usedShotTypes.get(pick.__shotType)||0)+1);
  usedBuckets.set(pick.__visualBucket,(usedBuckets.get(pick.__visualBucket)||0)+1);
 }
 chosen.sort((a,b)=>n(a.start??a.startTime,0)-n(b.start??b.startTime,0));
 if(chosen.length>1){const first=chosen[0];chosen[0]={...first,editorialRole:first.editorialRole||'hook'};const last=chosen[chosen.length-1];chosen[chosen.length-1]={...last,editorialRole:last.editorialRole||'hero-ending'};}
 return chosen.map(({__directorScore,__directorIndex,__shotType,__visualBucket,...m})=>({...m,directorSelectionScore:Number(__directorScore.toFixed(1)),directorSelectionIndex:__directorIndex,shotDiversityType:__shotType,visualBucket:__visualBucket}));
}
