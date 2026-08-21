/* BIKEZTAGRAM AI — pre-edit shot selector.
   Scores Gemini-verified moments before editorial styling. Never invents media. */
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const text=v=>String(v||'').toLowerCase();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const describe=m=>text([m.description,m.reason,m.action,m.event,m.editorialRole,m.shotType].join(' '));
const sourceKey=m=>String(m.mediaId??m.mediaIndex??'unknown');
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
function modes(prompt){const p=text(prompt);return{action:/action|fast|race|speed|chase|aggressive|energetic/.test(p),emotional:/emotional|beautiful|romantic|heartfelt|nostalgic/.test(p),reveal:/reveal|unveil|showcase|launch|introduction/.test(p),dark:/dark|moody|night|dramatic|gritty|noir/.test(p),social:/social|reel|tiktok|shorts|viral/.test(p)};}
function diversityPenalty(candidate,chosen){if(!chosen.length)return 0;const key=sourceKey(candidate);const recent=chosen.slice(-2);let penalty=recent.some(x=>sourceKey(x)===key)?10:0;const s=describe(candidate);const repeated=recent.some(x=>similarity(candidate,x)>.6);if(repeated)penalty+=18;return penalty;}
function similarity(a,b){const aw=new Set(describe(a).split(/\W+/).filter(x=>x.length>4));const bw=new Set(describe(b).split(/\W+/).filter(x=>x.length>4));let common=0;for(const x of aw)if(bw.has(x))common++;return common/Math.max(1,Math.min(aw.size,bw.size));}
function phaseBonus(moment,phase,mode){const s=describe(moment);if(phase==='hook')return /hook|opening|establish|tease/.test(s)?28:0;if(phase==='build')return /build|approach|movement|detail|anticip/.test(s)?16:0;if(phase==='reveal')return mode.reveal&&/reveal|unveil|showcase|profile|wide|hero/.test(s)?24:/reveal|unveil|showcase|profile/.test(s)?14:0;if(phase==='action')return /action|movement|speed|race|ride|drive|travel|impact|chase/.test(s)?(mode.action?24:12):0;if(phase==='hero')return /hero|ending|resolution|final|beauty|landscape/.test(s)?30:0;return 0;}
function phaseFor(index,total){if(index===0)return'hook';if(index===total-1)return'hero';const ratio=index/Math.max(1,total-1);if(ratio<.38)return'build';if(ratio<.68)return'reveal';return'action';}
export function selectDirectorMoments(moments,{maxCuts=8,targetDuration=15,creativePrompt=''}={}){
 if(!Array.isArray(moments)||!moments.length)return[];
 const mode=modes(creativePrompt); const ranked=moments.map((m,i)=>({...m,__directorScore:scoreMoment(m,i,moments.length,mode),__directorIndex:i}));
 const limit=Math.min(Math.max(1,maxCuts),ranked.length);const chosen=[];const available=[...ranked];
 while(chosen.length<limit&&available.length){const phase=phaseFor(chosen.length,limit);let bestIndex=0,best=-Infinity;
  for(let i=0;i<available.length;i++){const m=available[i];let value=m.__directorScore+phaseBonus(m,phase,mode)-diversityPenalty(m,chosen);
   const time=n(m.start??m.startTime,0);const sourceDuration=n(m.mediaDuration??m.sourceDuration,0);if(chosen.length&&time<n(chosen.at(-1).start??chosen.at(-1).startTime,0)-.25)value-=8;
   if(sourceDuration>0&&time/sourceDuration>.85&&phase==='hook')value-=6;
   if(phase==='hero'&&/hero|ending|resolution|final/.test(describe(m)))value+=12;
   if(value>best){best=value;bestIndex=i;}
  }
  chosen.push(available.splice(bestIndex,1)[0]);
 }
 chosen.sort((a,b)=>n(a.start??a.startTime,0)-n(b.start??b.startTime,0));
 if(chosen.length>1){chosen[0]={...chosen[0],editorialRole:chosen[0].editorialRole||'hook'};chosen[chosen.length-1]={...chosen.at(-1),editorialRole:chosen.at(-1).editorialRole||'hero-ending'};}
 return chosen.map(({__directorScore,__directorIndex,...m})=>({...m,directorSelectionScore:Number(__directorScore.toFixed(1)),directorSelectionIndex:__directorIndex}));
}
