/* BIKEZTAGRAM AI — pre-edit shot selector.
   Scores Gemini-verified moments before editorial styling. Never invents media.
   Selection is story-first: it penalises repeated visual roles, sources and
   descriptions, while reserving coverage for hook, build, reveal, action and hero beats. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const text=v=>String(v||'').toLowerCase();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const describe=m=>text([m.description,m.reason,m.action,m.event,m.editorialRole,m.shotType].join(' '));
const shotType=m=>text(m.shotType||m.shot||m.camera||m.framing);
const role=m=>text(m.editorialRole||m.purpose);
function scoreMoment(moment,index,total,mode){
 const s=describe(moment); const framing=shotType(moment); let score=n(moment.score,0)*2;
 if(/hook|opening|establish/.test(s))score+=18;
 if(/reveal|unveil|showcase|profile/.test(s))score+=12;
 if(/detail|close-up|macro/.test(s))score+=6;
 if(/wide|establishing|environment|landscape/.test(framing+' '+s))score+=10;
 if(/medium|profile|three-quarter/.test(framing+' '+s))score+=6;
 if(/action|movement|moving|speed|race|ride|drive|travel|impact|chase/.test(s))score+=mode.action?20:8;
 if(/emotion|beautiful|sunset|landscape|reaction|smile|laugh/.test(s))score+=mode.emotional?18:7;
 if(/hero|ending|resolution|final/.test(s))score+=15;
 if(index===0)score+=8;
 if(index===total-1)score+=6;
 if(moment.shotType)score+=5;
 if(moment.start!=null||moment.startTime!=null)score+=4;
 if(moment.confidence!=null)score+=n(moment.confidence,.5)*8;
 return score;
}
function modes(prompt){const p=text(prompt);return{action:/action|fast|race|speed|chase|aggressive|energetic/.test(p),emotional:/emotional|beautiful|romantic|heartfelt|nostalgic/.test(p),reveal:/reveal|launch|unveil|showcase|introduc/.test(p)};}
function visualKey(moment){
 const raw=text([moment.visualKey,moment.visualSignature,moment.description,moment.shotType,moment.camera,moment.framing].filter(Boolean).join(' '));
 return raw.replace(/\b(the|a|an|bike|motorcycle|motorbike|ninja|1000sx|kawasaki|subject|shot|clip|video|photo|image)\b/g,' ').replace(/\W+/g,' ').trim();
}
function similarity(a,b){
 const aw=new Set(visualKey(a).split(/\s+/).filter(x=>x.length>3));
 const bw=new Set(visualKey(b).split(/\s+/).filter(x=>x.length>3));
 if(!aw.size||!bw.size)return 0;
 let common=0;for(const x of aw)if(bw.has(x))common++;
 return common/Math.max(1,Math.min(aw.size,bw.size));
}
function coveragePenalty(candidate,chosen,position,total,mode){
 const s=describe(candidate); const framing=shotType(candidate); const r=role(candidate);
 let penalty=0;
 const details=chosen.filter(m=>/detail|close-up|macro/.test(describe(m))||/detail|close-up|macro/.test(shotType(m))).length;
 const wides=chosen.filter(m=>/wide|establishing|environment|landscape/.test(describe(m)+' '+shotType(m))).length;
 const actions=chosen.filter(m=>/action|movement|moving|speed|race|ride|drive|travel|impact|chase/.test(describe(m))).length;
 const reveals=chosen.filter(m=>/reveal|unveil|showcase/.test(describe(m))).length;
 if(details>=Math.max(2,Math.floor(total*.3))&&/detail|close-up|macro/.test(s+' '+framing))penalty+=28;
 if(position<Math.max(1,Math.floor(total*.35))&&details>=2&&/detail|close-up|macro/.test(s+' '+framing))penalty+=18;
 if(wides===0&&position>=1&&!/wide|establishing|environment|landscape/.test(s+' '+framing))penalty+=8;
 if(mode.action&&actions>=Math.max(2,Math.floor(total*.5))&&modeAction(s))penalty+=12;
 if(/reveal|unveil|showcase/.test(s)&&reveals>=1)penalty+=14;
 if(r==='detail'&&details>=2)penalty+=18;
 return penalty;
}
function modeAction(s){return /action|movement|moving|speed|race|ride|drive|travel|impact|chase/.test(s);}
function roleBonus(candidate,position,total,mode){
 const s=describe(candidate); let bonus=0;
 if(position===0&&/hook|opening|establish/.test(s))bonus+=24;
 if(position===0&&/wide|establishing|environment/.test(s))bonus+=10;
 if(position===total-1&&/hero|ending|resolution|final/.test(s))bonus+=24;
 if(mode.reveal&&position>=Math.floor(total*.45)&&position<=Math.ceil(total*.8)&&/reveal|unveil|showcase|profile/.test(s))bonus+=18;
 if(mode.action&&position>=Math.floor(total*.35)&&/action|movement|speed|race|ride|drive|travel|impact|chase/.test(s))bonus+=12;
 return bonus;
}
export function selectDirectorMoments(moments,{maxCuts=8,targetDuration=15,creativePrompt=''}={}){
 if(!Array.isArray(moments)||!moments.length)return[];
 const mode=modes(creativePrompt); const ranked=moments.map((m,i)=>({...m,__directorScore:scoreMoment(m,i,moments.length,mode),__directorIndex:i})).sort((a,b)=>b.__directorScore-a.__directorScore);
 const limit=Math.min(Math.max(1,maxCuts),ranked.length); const chosen=[]; const usedSources=new Set(); const usedDescriptions=[];
 const ordered=[...ranked];
 while(chosen.length<limit&&ordered.length){let bestIndex=0,best=-Infinity;for(let i=0;i<ordered.length;i++){
  const m=ordered[i]; const position=chosen.length; let value=m.__directorScore+roleBonus(m,position,limit,mode)-coveragePenalty(m,chosen,position,limit,mode);
  const source=String(m.mediaId??m.mediaIndex??'unknown');
  if(usedSources.has(source))value-=18;
  if(usedDescriptions.some(d=>d===describe(m)))value-=35;
  if(chosen.length&&similarity(m,chosen[chosen.length-1])>.65)value-=22;
  if(chosen.some(existing=>similarity(m,existing)>.82))value-=20;
  if(value>best){best=value;bestIndex=i;}
 }
 const pick=ordered.splice(bestIndex,1)[0]; chosen.push(pick); usedSources.add(String(pick.mediaId??pick.mediaIndex??'unknown')); usedDescriptions.push(describe(pick)); }
 if(chosen.length>1){const first=chosen[0];chosen[0]={...first,editorialRole:first.editorialRole||'hook'};const last=chosen[chosen.length-1];chosen[chosen.length-1]={...last,editorialRole:last.editorialRole||'hero-ending'};}
 return chosen.map(({__directorScore,__directorIndex,...m})=>({...m,directorSelectionScore:Number(__directorScore.toFixed(1)),directorSelectionIndex:__directorIndex}));
}
