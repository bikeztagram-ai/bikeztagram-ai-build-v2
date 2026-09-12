#!/usr/bin/env node
/** Add a deterministic, media-scaled story-beat planner to the universal director. */
import fs from 'node:fs';

const file='src/director.js';
let source=fs.readFileSync(file,'utf8');
if(source.includes('export function buildDirectorStory')){console.log('[autobot] Director story planner already present.');process.exit(0);}
const anchor='export function buildUniversalMediaProfile(mediaItems=[]){';
const at=source.indexOf(anchor);
if(at<0)throw new Error('director.js universal profile anchor not found; refusing blind edit.');
const insertion=`
export function buildDirectorStory(mediaItems=[],{creativePrompt='',targetDuration=15}={}){
 const items=Array.isArray(mediaItems)?mediaItems:[];if(!items.length)return[];
 const prompt=lower(creativePrompt);const action=/action|fast|race|speed|chase|energetic|adventure|movement/.test(prompt);const reveal=/reveal|launch|unveil|showcase|introduction|trailer|hero/.test(prompt);const emotional=/emotional|beautiful|romantic|nostalgic|heartfelt|calm/.test(prompt);
 const duration=Math.max(1,Number(targetDuration)||15);const desiredCount=items.length<=2?items.length:Math.min(items.length,clamp(Math.round(duration/2.5),3,8));
 const middleRoles=[];if(reveal)middleRoles.push('reveal');if(action)middleRoles.push('action');if(emotional)middleRoles.push('emotional-beat');const neutralRoles=['build','detail','approach'];let neutralIndex=0;while(middleRoles.length<desiredCount-2){middleRoles.push(neutralRoles[neutralIndex%neutralRoles.length]);neutralIndex+=1;}
 const roles=desiredCount===1?['hero-ending']:['hook',...middleRoles.slice(0,Math.max(0,desiredCount-2)),'hero-ending'];
 const chosen=[];const usedSubjects=new Set();const usedFamilies=new Set();
 for(let i=0;i<roles.length;i++){
  const role=roles[i];const candidates=rankDirectorCandidates(items,role,{creativePrompt,usedIndices:chosen.map(item=>item.__index??item.mediaIndex),usedFamilies:[...usedFamilies],usedSubjects:[...usedSubjects]});
  if(!candidates.length)break;
  const best=candidates[0];const candidate={...best.media,__index:best.index,__score:best.score,__subject:best.subjectType,__family:best.family,editorialRole:role};chosen.push(candidate);
  if(candidate.__subject!=='unknown')usedSubjects.add(candidate.__subject);if(candidate.__family!=='unknown')usedFamilies.add(candidate.__family);
 }
 if(chosen.length<desiredCount){for(const media of items){const index=items.indexOf(media);if(chosen.some(item=>(item.__index??item.mediaIndex)===index))continue;chosen.push({...media,__index:index,__score:scoreMedia(media),__subject:classifyMediaSubject(media),__family:mediaFamily(media),editorialRole:chosen.length===desiredCount-1?'hero-ending':'build'});if(chosen.length>=desiredCount)break;}}
 return chosen.slice(0,desiredCount).map(({__score,__index,__subject,__family,...media})=>({...media,mediaIndex:Number.isInteger(Number(media.mediaIndex))?Number(media.mediaIndex):__index,directorStoryRole:media.editorialRole,directorStoryScore:Number(__score||0),directorStoryEvidence:{subjectType:__subject,family:__family,targetDuration:duration,storyPosition:chosen.findIndex(item=>(item.__index??item.mediaIndex)===__index)}}));
}
`;
source=source.slice(0,at)+insertion+source.slice(at);fs.writeFileSync(file,source);console.log('[autobot] Added media-scaled deterministic director story-beat planner.');
