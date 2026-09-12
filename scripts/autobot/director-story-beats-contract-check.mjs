#!/usr/bin/env node
import fs from 'node:fs';
const director=fs.readFileSync('src/director.js','utf8');
if(!director.includes('export function buildDirectorStory'))throw new Error('Director story planner export missing.');
if(!director.includes('directorStoryRole'))throw new Error('Director story role metadata missing.');
const {buildDirectorStory}=await import('../../src/director.js');
const media=Array.from({length:8},(_,index)=>({id:`story-${index}`,type:index%2?'video/mp4':'image/jpeg',name:['wide establishing','rider approach','motorcycle action','cockpit detail','mountain journey','speed road','sunset reveal','hero showcase'][index],duration:index%2?4:0,width:1920,height:1080,score:80-index}));
const one=buildDirectorStory(media.slice(0,1),{creativePrompt:'cinematic reveal',targetDuration:15});
const two=buildDirectorStory(media.slice(0,2),{creativePrompt:'cinematic reveal',targetDuration:15});
const rich=buildDirectorStory(media,{creativePrompt:'cinematic motorcycle journey with reveal and action',targetDuration:15});
if(one.length!==1)throw new Error(`Single-source story contract failed: ${one.length} beats.`);
if(two.length!==2)throw new Error(`Two-source story contract failed: ${two.length} beats.`);
if(rich.length<5)throw new Error(`Rich-media story contract failed: expected at least 5 beats, got ${rich.length}.`);
if(rich.length>media.length)throw new Error(`Story contract failed: ${rich.length} beats exceed ${media.length} sources.`);
if(new Set(rich.map(item=>item.mediaIndex)).size!==rich.length)throw new Error('Story contract failed: duplicate source indices.');
if(!rich.every(item=>item.directorStoryRole&&Number.isFinite(Number(item.directorStoryScore))))throw new Error('Story contract failed: missing auditable role/score evidence.');
console.log(`director-story-beats-contract: PASS single=${one.length} two=${two.length} rich=${rich.length}`);
