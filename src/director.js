const ACTION_WORDS=['action','movement','running','walking','riding','driving','accelerating','cornering','chase','jumping','playing','flying','swimming','dancing','travel','journey'];
const HERO_WORDS=['hero','reveal','portrait','close-up','landscape','sunset','detail','showcase','beautiful','epic','product'];
const EMOTION_WORDS=['smile','laugh','joy','cute','love','dramatic','emotional','surprise','calm','peaceful','excited'];
function clamp(n,min,max){return Math.max(min,Math.min(n,max));}
function lower(value){return String(value??'').toLowerCase();}
function searchableMedia(m){return lower([m?.name,m?.description,m?.subject,m?.label,m?.contentType].filter(Boolean).join(' '));}
export function scoreMedia(m){
 const searchable=searchableMedia(m);let score=50;
 if(lower(m?.type).startsWith('video'))score+=15;if(lower(m?.type).startsWith('image'))score+=8;
 if(Number(m?.duration)>0)score+=clamp(Math.min(Number(m.duration),15)*1.5,0,18);
 ACTION_WORDS.forEach(w=>{if(searchable.includes(w))score+=3;});HERO_WORDS.forEach(w=>{if(searchable.includes(w))score+=2;});EMOTION_WORDS.forEach(w=>{if(searchable.includes(w))score+=2;});
 if(Number(m?.score)>0)score+=clamp(Number(m.score)*.2,0,15);
 if(m?.width&&m?.height){const ratio=Number(m.width)/Number(m.height);if(ratio>.45&&ratio<2.4)score+=5;if(ratio>.8&&ratio<2)score+=4;}
 return clamp(Math.round(score),0,100);
}
export function classifyMediaSubject(media={}){const text=searchableMedia(media);const rules=[['animal',/animal|dog|puppy|cat|horse|bird|wildlife|pet/],['vehicle',/motorcycle|motorbike|bike|car|vehicle|truck|van|bus|boat|plane|aircraft/],['person',/person|people|rider|driver|traveller|traveler|athlete|dancer|portrait/],['landscape',/landscape|mountain|beach|forest|lake|ocean|city|skyline|sunset|nature/],['product',/product|watch|phone|shoe|clothing|food|drink|advert|commercial/],['event',/event|concert|wedding|party|festival|sport|race/]];const match=rules.find(([,pattern])=>pattern.test(text));return match?match[0]:'unknown';}
export function buildUniversalMediaProfile(mediaItems=[]){const items=Array.isArray(mediaItems)?mediaItems:[];const profiles=items.map((media,index)=>({index,subjectType:classifyMediaSubject(media),score:scoreMedia(media),type:media?.type||'unknown',duration:Number(media?.duration)||0,width:Number(media?.width)||0,height:Number(media?.height)||0}));const subjectCounts={};profiles.forEach(p=>{subjectCounts[p.subjectType]=(subjectCounts[p.subjectType]||0)+1;});return{version:'universal-director-v1',mediaCount:profiles.length,subjectCounts,primarySubjectType:Object.entries(subjectCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'unknown',items:profiles};}
