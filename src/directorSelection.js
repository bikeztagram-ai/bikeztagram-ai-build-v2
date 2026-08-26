/* BIKEZTAGRAM AI — pre-edit shot selector.
   Scores Gemini-verified moments before editorial styling. Never invents media.
   The selector deliberately trades a small amount of raw score for story coverage,
   shot-family diversity, source diversity and temporal separation. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const text=v=>String(v||'').toLowerCase();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const describe=m=>text([m.description,m.reason,m.action,m.event,m.editorialRole,m.shotType,m.composition,m.framing,m.cameraAngle].join(' '));
const sourceKey=m=>String(m.mediaId??m.mediaIndex??'unknown');
const startOf=m=>n(m.start??m.startTime,NaN);
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
function roleBonus(moment,role){
 const s=describe(moment);
 if(role==='hook')return /hook|opening|establish|impact|action|reveal/.test(s)?24:0;
 if(role==='hero')return /hero|ending|resolution|final|showcase|reveal|portrait|landscape/.test(s)?24:0;
 if(role==='build')return /movement|tracking|journey|road|approach|detail|medium|wide/.test(s)?10:0;
 if(role==='reveal')return /reveal|unveil|showcase|profile|product|vehicle|motorcycle|bike|portrait/.test(s)?18:0;
 if(role==='action')return /action|movement|speed|race|ride|drive|chase|impact/.test(s)?18:0;
 if(role==='emotional')return /emotion|beautiful|sunset|landscape|reaction|smile|laugh|calm/.test(s)?16:0;
 return 0;
}
export function selectDirectorMoments(moments,{maxCuts=8,targetDuration=15,creativePrompt=''}={}){
 if(!Array.isArray(moments)||!moments.length)return[];
 const mode=modes(creativePrompt); const ranked=moments.map((m,i)=>({...m,__directorScore:scoreMoment(m,i,moments.length,mode),__directorIndex:i,__shotFamily:shotFamily(m)})).sort((a,b)=>b.__directorScore-a.__directorScore);
 const limit=Math.min(Math.max(1,maxCuts),ranked.length);
 const chosen=[]; const usedSources=new Set(); const usedDescriptions=[]; const usedFamilies=new Map();
 const similarity=(a,b)=>{const aw=new Set(describe(a).split(/\W+/).filter(x=>x.length>4));const bw=new Set(describe(b).split(/\W+/).filter(x=>x.length>4));let common=0;for(const x of aw)if(bw.has(x))common++;return common/Math.max(1,Math.min(aw.size,bw.size));};
 const temporalDistance=(a,b)=>{const sa=startOf(a),sb=startOf(b);return Number.isFinite(sa)&&Number.isFinite(sb)?Math.abs(sa-sb):Infinity;};
 const ordered=[...ranked];
 while(chosen.length<limit&&ordered.length){let bestIndex=0,best=-Infinity;const role=desiredRole(chosen.length,limit,mode);
  for(let i=0;i<ordered.length;i++){
   const m=ordered[i];let value=m.__directorScore+roleBonus(m,role);const source=sourceKey(m);const family=m.__shotFamily;
   if(usedSources.has(source))value-=12;
   const familyCount=usedFamilies.get(family)||0;
   if(familyCount)value-=12*familyCount;
   if(chosen.length&&similarity(m,chosen[chosen.length-1])>.65)value-=18;
   if(usedDescriptions.some(d=>d===describe(m)))value-=30;
   if(chosen.some(c=>temporalDistance(m,c)<1.25))value-=12;
   if(chosen.length===0&&/opening|hook/.test(describe(m)))value+=20;
   if(chosen.length===limit-1&&/hero|ending|resolution/.test(describe(m)))value+=18;
   if(!familyCount&&chosen.length>0)value+=7;
   if(value>best){best=value;bestIndex=i;}
  }
  const pick=ordered.splice(bestIndex,1)[0];
  // Preserve the editorial sequence chosen above. Sorting the final selection
  // back into source-time order made the Director lose its hook/build/reveal/
  // action/hero story arc whenever the strongest shots came from different files.
  pick.editorialRole=pick.editorialRole||role;
  pick.directorStoryPosition=chosen.length;
  pick.directorStoryRole=role;
  chosen.push(pick);
  usedSources.add(sourceKey(pick)); usedDescriptions.push(describe(pick)); usedFamilies.set(pick.__shotFamily,(usedFamilies.get(pick.__shotFamily)||0)+1);
 }
 if(chosen.length>1){
  chosen[0]={...chosen[0],editorialRole:chosen[0].editorialRole||'hook',directorStoryRole:'hook',directorStoryPosition:0};
  const lastIndex=chosen.length-1;
  chosen[lastIndex]={...chosen[lastIndex],editorialRole:chosen[lastIndex].editorialRole||'hero-ending',directorStoryRole:'hero',directorStoryPosition:lastIndex};
 }
 return chosen.map(({__directorScore,__directorIndex,__shotFamily,...m})=>({...m,directorSelectionScore:Number(__directorScore.toFixed(1)),directorSelectionIndex:__directorIndex,directorShotFamily:shotFamily(m)}));
}
