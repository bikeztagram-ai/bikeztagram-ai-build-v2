const ACTION_WORDS=['action','movement','moving','running','walking','riding','driving','accelerating','cornering','chase','jumping','playing','flying','swimming','dancing','travel','journey','race','racing','overtake','overtaking','drift','drifting','launch','takeoff','landing','impact','speed'];
const HERO_WORDS=['hero','reveal','portrait','close-up','landscape','sunset','detail','showcase','beautiful','epic','product','final','ending','wide'];
const EMOTION_WORDS=['smile','laugh','joy','cute','love','dramatic','emotional','surprise','calm','peaceful','excited','nostalgic','beautiful'];
const VEHICLE_WORDS=['motorcycle','motorbike','bike','biker','rider','riding','ninja','scooter','moped','vespa','scooty','atv','quad','car','vehicle','truck','van','bus','boat','plane'];
const STATIC_WORDS=['parked','stationary','still','static','stopped','idle','empty','screenshot','thumbnail'];
const CINEMATIC_WORDS=['cinematic','film','film-like','trailer','composition','tracking','close-up','wide','aerial','drone','depth','bokeh','silhouette','golden hour','leading lines','rule of thirds'];
const CAMERA_WORDS=['tracking','orbit','pan','tilt','push','pull','dolly','handheld','drone','aerial','close-up','macro','wide','medium','overhead'];
function clamp(n,min,max){return Math.max(min,Math.min(n,max));}
function lower(value){return String(value??'').toLowerCase();}
function searchableMedia(m){return lower([m?.name,m?.description,m?.subject,m?.label,m?.contentType,m?.tags,m?.keywords,m?.action,m?.event,m?.composition,m?.cameraMotion,m?.shotType].filter(Boolean).join(' '));}
function numeric(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function signal01(m,names){for(const name of names){const n=numeric(m?.[name]);if(n!=null)return clamp(n<=1?n*100:n,0,100);}return null;}
function addWords(score,text,words,weight){for(const word of words)if(text.includes(word))score+=weight;return score;}
export function scoreMedia(m){
 const text=searchableMedia(m);let score=48;
 const type=lower(m?.type);if(type.startsWith('video'))score+=12;else if(type.startsWith('image'))score+=8;
 const duration=numeric(m?.duration);
 if(duration!=null&&duration>0){if(duration>=2&&duration<=12)score+=Math.min(15,duration*1.35);else if(duration>12)score+=Math.max(-12,15-(duration-12)*.7);else score+=duration*1.5;}
 score=addWords(score,text,ACTION_WORDS,3);score=addWords(score,text,HERO_WORDS,2);score=addWords(score,text,EMOTION_WORDS,1.5);score=addWords(score,text,VEHICLE_WORDS,2);score=addWords(score,text,CINEMATIC_WORDS,1.25);score=addWords(score,text,CAMERA_WORDS,1.25);score=addWords(score,text,STATIC_WORDS,-6);
 const action=signal01(m,['actionScore','motionScore','movementScore','activityScore']);if(action!=null)score+=action*.22;
 const cinematic=signal01(m,['cinematicScore','visualQuality','qualityScore','aestheticScore']);if(cinematic!=null)score+=cinematic*.16;
 const composition=signal01(m,['compositionScore','framingScore','cameraScore']);if(composition!=null)score+=composition*.12;
 const sharpness=signal01(m,['sharpnessScore','clarityScore']);if(sharpness!=null)score+=sharpness*.08;
 const confidence=signal01(m,['confidence']);if(confidence!=null)score+=confidence*.06;
 const explicit=numeric(m?.score);if(explicit!=null)score+=clamp(explicit*.18,0,15);
 if(m?.width&&m?.height){const ratio=Number(m.width)/Number(m.height);if(ratio>.45&&ratio<2.4)score+=5;if(ratio>.8&&ratio<2)score+=3;}
 return clamp(Math.round(score),0,100);
}
export function classifyMediaSubject(media={}){const text=searchableMedia(media);const rules=[['animal',/animal|dog|puppy|cat|horse|bird|wildlife|pet/],['vehicle',/motorcycle|motorbike|bike|biker|rider|riding|car|vehicle|truck|van|bus|boat|plane|aircraft|scooter|moped|vespa|scooty|atv|quad/],['person',/person|people|driver|traveller|traveler|athlete|dancer|portrait|human|man|woman|child/],['landscape',/landscape|mountain|beach|forest|lake|ocean|city|skyline|sunset|nature|road|street/],['product',/product|watch|phone|shoe|clothing|food|drink|advert|commercial/],['event',/event|concert|wedding|party|festival|sport|race|racing/]];const match=rules.find(([,pattern])=>pattern.test(text));return match?match[0]:'unknown';}
export function buildUniversalMediaProfile(mediaItems=[]){const items=Array.isArray(mediaItems)?mediaItems:[];const profiles=items.map((media,index)=>({index,subjectType:classifyMediaSubject(media),score:scoreMedia(media),type:media?.type||'unknown',duration:Number(media?.duration)||0,width:Number(media?.width)||0,height:Number(media?.height)||0}));const subjectCounts={};profiles.forEach(p=>{subjectCounts[p.subjectType]=(subjectCounts[p.subjectType]||0)+1;});return{version:'universal-director-v2',mediaCount:profiles.length,subjectCounts,primarySubjectType:Object.entries(subjectCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'unknown',items:profiles};}
export function buildShotMotion(shot={}){const type=lower(shot?.type||shot?.intent||shot?.role||'');const subject=lower(shot?.subjectType||shot?.subject||'');const explicit=lower(shot?.cameraMotion||shot?.motionStyle||'');if(explicit)return{type:explicit,scale:subject==='vehicle'?1.08:1.05,duration:Number(shot.duration)||3};if(type.includes('action')||type.includes('movement'))return{type:subject==='vehicle'?'tracking-push-pan':subject==='person'?'orbit-push':subject==='landscape'?'wide-pan':'push-pan',scale:1.08,duration:Number(shot.duration)||3};if(type.includes('hero')||type.includes('reveal'))return{type:subject==='vehicle'?'slow-arc':subject==='product'?'precision-push':'slow-push',scale:1.05,duration:Number(shot.duration)||3};if(subject==='landscape')return{type:'wide-drift',scale:1.025,duration:Number(shot.duration)||3};if(subject==='person'||subject==='animal')return{type:'gentle-follow',scale:1.03,duration:Number(shot.duration)||3};return{type:'subtle-drift',scale:1.02,duration:Number(shot.duration)||3};}
export function buildShotDirection(shot={}){const subject=lower(shot?.subjectType||shot?.subject||'unknown');const role=lower(shot?.role||shot?.editorialRole||shot?.intent||'story-beat');const direction=buildShotMotion({...shot,subjectType:subject});return{subjectType:subject,role,motion:direction,cameraIntent:role==='hero-ending'?'hold-and-settle':role==='hook'?'immediate-attention':role==='action'?'escalate-motion':role==='reveal'?'controlled-reveal':'controlled-cinematic',preserveSubject:true};}
