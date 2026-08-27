const ACTION_WORDS=['action','movement','running','walking','riding','driving','accelerating','cornering','chase','jumping','playing','flying','swimming','dancing','travel','journey'];
const HERO_WORDS=['hero','reveal','portrait','close-up','landscape','sunset','detail','showcase','beautiful','epic','product'];
const EMOTION_WORDS=['smile','laugh','joy','cute','love','dramatic','emotional','surprise','calm','peaceful','excited'];
function clamp(n,min,max){return Math.max(min,Math.min(n,max));}
function lower(value){return String(value??'').toLowerCase();}
function searchableMedia(m){return lower([m?.name,m?.description,m?.subject,m?.label,m?.contentType].filter(Boolean).join(' '));}
export function scoreMedia(m){const searchable=searchableMedia(m);let score=50;if(lower(m?.type).startsWith('video'))score+=15;if(lower(m?.type).startsWith('image'))score+=8;if(Number(m?.duration)>0)score+=clamp(Math.min(Number(m.duration),15)*1.5,0,18);ACTION_WORDS.forEach(w=>{if(searchable.includes(w))score+=3;});HERO_WORDS.forEach(w=>{if(searchable.includes(w))score+=2;});EMOTION_WORDS.forEach(w=>{if(searchable.includes(w))score+=2;});if(Number(m?.score)>0)score+=clamp(Number(m.score)*.2,0,15);if(m?.width&&m?.height){const ratio=Number(m.width)/Number(m.height);if(ratio>.45&&ratio<2.4)score+=5;if(ratio>.8&&ratio<2)score+=4;}return clamp(Math.round(score),0,100);}
export function classifyMediaSubject(media={}){const text=searchableMedia(media);const rules=[['animal',/animal|dog|puppy|cat|horse|bird|wildlife|pet/],['vehicle',/motorcycle|motorbike|bike|car|vehicle|truck|van|bus|boat|plane|aircraft/],['person',/person|people|rider|driver|traveller|traveler|athlete|dancer|portrait/],['landscape',/landscape|mountain|beach|forest|lake|ocean|city|skyline|sunset|nature/],['product',/product|watch|phone|shoe|clothing|food|drink|advert|commercial/],['event',/event|concert|wedding|party|festival|sport|race/]];const match=rules.find(([,pattern])=>pattern.test(text));return match?match[0]:'unknown';}

export function buildDirectorStory(mediaItems=[],{creativePrompt='',targetDuration=15}={}){
 const items=Array.isArray(mediaItems)?mediaItems:[];if(!items.length)return[];
 const prompt=lower(creativePrompt);const action=/action|fast|race|speed|chase|energetic|adventure/.test(prompt);const reveal=/reveal|launch|unveil|showcase|introduction|trailer/.test(prompt);const emotional=/emotional|beautiful|romantic|nostalgic|heartfelt/.test(prompt);
 const ranked=items.map((media,index)=>({...media,__score:scoreMedia(media),__index:index,__subject:classifyMediaSubject(media)})).sort((a,b)=>b.__score-a.__score);
 const roles=items.length===1?['hero']:items.length===2?['hook','hero']:['hook','build',reveal?'reveal':action?'action':emotional?'emotional-beat':'build','hero'];const chosen=[];const usedSubjects=new Set();
 for(let i=0;i<Math.min(roles.length,ranked.length);i++){const role=roles[i];let best=null;let bestValue=-Infinity;for(const candidate of ranked){if(chosen.some(x=>x.__index===candidate.__index))continue;let value=candidate.__score;const s=searchableMedia(candidate);if(i===0&&/action|movement|hook|impact/.test(s))value+=18;if(role==='hero'&&/hero|reveal|showcase|detail|landscape/.test(s))value+=20;if(role==='action'&&/action|movement|speed|race|ride|drive/.test(s))value+=20;if(role==='reveal'&&/reveal|unveil|showcase|product|vehicle|motorcycle/.test(s))value+=20;if(role==='emotional'&&/beautiful|sunset|landscape|emotion|calm/.test(s))value+=18;if(candidate.__subject!=='unknown'&&usedSubjects.has(candidate.__subject))value-=12;if(value>bestValue){bestValue=value;best=candidate;}}if(best){chosen.push({...best,editorialRole:role});if(best.__subject!=='unknown')usedSubjects.add(best.__subject);}}
 if(chosen.length<Math.min(3,ranked.length))for(const candidate of ranked){if(chosen.some(x=>x.__index===candidate.__index))continue;chosen.push({...candidate,editorialRole:chosen.length===0?'hook':'build'});if(chosen.length>=Math.min(3,ranked.length))break;}
 return chosen.map(({__score,__index,__subject,...media})=>({...media,mediaIndex:Number.isInteger(Number(media.mediaIndex))?Number(media.mediaIndex):__index,directorStoryRole:media.editorialRole,directorStoryScore:__score,targetDuration:Number(targetDuration)||15}));
}
export function buildUniversalMediaProfile(mediaItems=[]){const items=Array.isArray(mediaItems)?mediaItems:[];const profiles=items.map((media,index)=>({index,subjectType:classifyMediaSubject(media),score:scoreMedia(media),type:media?.type||'unknown',duration:Number(media?.duration)||0,width:Number(media?.width)||0,height:Number(media?.height)||0}));const subjectCounts={};profiles.forEach(p=>{subjectCounts[p.subjectType]=(subjectCounts[p.subjectType]||0)+1;});return{version:'universal-director-v1',mediaCount:profiles.length,subjectCounts,primarySubjectType:Object.entries(subjectCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'unknown',items:profiles};}
export function buildShotMotion(shot={}){const type=lower(shot?.type||shot?.intent||'');const subject=lower(shot?.subjectType||shot?.subject||'');if(type.includes('action')||type.includes('movement'))return{type:subject==='vehicle'?'tracking-push-pan':subject==='person'?'orbit-push':subject==='landscape'?'wide-pan':'push-pan',scale:1.08,duration:Number(shot.duration)||3};if(type.includes('hero')||type.includes('reveal'))return{type:subject==='vehicle'?'slow-arc':subject==='product'?'precision-push':'slow-push',scale:1.05,duration:Number(shot.duration)||3};if(subject==='landscape')return{type:'wide-drift',scale:1.025,duration:Number(shot.duration)||3};if(subject==='person'||subject==='animal')return{type:'gentle-follow',scale:1.03,duration:Number(shot.duration)||3};return{type:'subtle-drift',scale:1.02,duration:Number(shot.duration)||3};}
export function buildShotDirection(shot={}){const subject=lower(shot?.subjectType||shot?.subject||'unknown');const role=lower(shot?.role||shot?.intent||'story-beat');const direction=buildShotMotion({...shot,subjectType:subject});return{subjectType:subject,role,motion:direction,cameraIntent:role==='hero-ending'?'hold-and-settle':role==='hook'?'immediate-attention':role==='action'?'escalate-motion':'controlled-cinematic',preserveSubject:true};}

export function rankDirectorCandidates(candidates=[]){
 if(!Array.isArray(candidates))return [];
 const seen=new Set();
 return [...candidates].sort((a,b)=>{
  const as=Number(a?.score??a?.directorSelectionScore??0),bs=Number(b?.score??b?.directorSelectionScore??0);
  const ak=String(a?.subjectRole||a?.subject||a?.mediaIndex||'');
  const bk=String(b?.subjectRole||b?.subject||b?.mediaIndex||'');
  const ap=seen.has(ak)?-8:0,bp=seen.has(bk)?-8:0;
  return (bs+bp)-(as+ap);
 }).map(item=>{const key=String(item?.subjectRole||item?.subject||item?.mediaIndex||'');seen.add(key);return item;});
}

export function buildSubjectAwareMotion(shot={}, subjectType='unknown'){
 const type=String(shot?.type||shot?.intent||'').toLowerCase();
 const subject=String(subjectType||'unknown').toLowerCase();
 const base=buildShotMotion(shot);
 if(subject==='vehicle'&&(/action|movement/.test(type))) return {...base,type:'orbit-push',scale:Math.max(base.scale,1.08),intensity:1.15};
 if(subject==='landscape'&&(/hero|reveal/.test(type))) return {...base,type:'slow-pan',scale:1.04,intensity:.72};
 if(subject==='person'&&/detail|portrait/.test(type)) return {...base,type:'micro-push',scale:1.03,intensity:.62};
 return {...base,intensity:type.includes('action')?1.1:.85};
}
