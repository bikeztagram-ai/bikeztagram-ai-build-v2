/* BIKEZTAGRAM AI — pre-edit shot selector.
   Scores Gemini-verified moments before editorial styling. Never invents media. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const text=v=>String(v||'').toLowerCase();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const describe=m=>text([m.description,m.reason,m.action,m.event,m.editorialRole,m.shotType].join(' '));
const subject=m=>text(m.subjectRole||m.subject||m.identity);
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
 return score;
}
function modes(prompt){const p=text(prompt);return{action:/action|fast|race|speed|chase|aggressive|energetic/.test(p),emotional:/emotional|beautiful|romantic|heartfelt|nostalgic/.test(p)};}
export function selectDirectorMoments(moments,{maxCuts=8,targetDuration=15,creativePrompt=''}={}){
 if(!Array.isArray(moments)||!moments.length)return[];
 const mode=modes(creativePrompt); const ranked=moments.map((m,i)=>({...m,__directorScore:scoreMoment(m,i,moments.length,mode),__directorIndex:i})).sort((a,b)=>b.__directorScore-a.__directorScore);
 const limit=Math.min(Math.max(1,maxCuts),ranked.length);
 const chosen=[]; const usedSources=new Set(); const usedDescriptions=[];
 const similarity=(a,b)=>{const aw=new Set(describe(a).split(/\W+/).filter(x=>x.length>4));const bw=new Set(describe(b).split(/\W+/).filter(x=>x.length>4));let common=0;for(const x of aw)if(bw.has(x))common++;return common/Math.max(1,Math.min(aw.size,bw.size));};
 const ordered=[...ranked];
 while(chosen.length<limit&&ordered.length){let bestIndex=0,best=-Infinity;for(let i=0;i<ordered.length;i++){const m=ordered[i];let value=m.__directorScore;const source=String(m.mediaId??m.mediaIndex??'unknown');if(usedSources.has(source))value-=10;if(chosen.length&&similarity(m,chosen[chosen.length-1])>.65)value-=18;if(usedDescriptions.some(d=>d===describe(m)))value-=30;if(chosen.length===0&&/opening|hook/.test(describe(m)))value+=20;if(chosen.length===limit-1&&/hero|ending|resolution/.test(describe(m)))value+=18;if(value>best){best=value;bestIndex=i;}}
 const pick=ordered.splice(bestIndex,1)[0];chosen.push(pick);usedSources.add(String(pick.mediaId??pick.mediaIndex??'unknown'));usedDescriptions.push(describe(pick));}
 chosen.sort((a,b)=>n(a.start??a.startTime,0)-n(b.start??b.startTime,0));
 if(chosen.length>1){const first=chosen[0];chosen[0]={...first,editorialRole:first.editorialRole||'hook'};const last=chosen[chosen.length-1];chosen[chosen.length-1]={...last,editorialRole:last.editorialRole||'hero-ending'};}
 return chosen.map(({__directorScore,__directorIndex,...m})=>({...m,directorSelectionScore:Number(__directorScore.toFixed(1)),directorSelectionIndex:__directorIndex}));
}
