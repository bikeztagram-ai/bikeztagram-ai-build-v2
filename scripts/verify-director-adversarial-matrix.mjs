import assert from 'node:assert/strict';
import {buildDirectorStory} from '../src/director.js';
import {createAIEditPlan} from '../src/aiEditPlanner.js';
const media=Array.from({length:12},(_,i)=>({id:'m'+i,type:i%3===0?'image/jpeg':'video/mp4',name:['mountain establishing','rider approach','motorcycle action','cockpit detail','landscape reveal','bike acceleration','sunset reveal','hero motorcycle','road detail','rider departure','mountain action','final hero'][i],duration:i%3?3:0,width:1920,height:1080,score:80+i}));
for(const prompt of ['cinematic motorcycle action reveal','slow emotional reveal','fast energetic social reel','cinematic journey']){
 const story=buildDirectorStory(media,{creativePrompt:prompt,targetDuration:30});
 assert.equal(story.length,12);
 assert.equal(new Set(story.map(x=>x.mediaIndex)).size,12);
 assert.ok(story.every(x=>x.directorStoryRole&&Number.isFinite(Number(x.directorStoryScore))));
 const plan=createAIEditPlan({durationInSeconds:30,mediaCount:12,bestMoments:media.map((m,i)=>({...m,mediaIndex:i,sourceIndex:i,start:i*2,end:i*2+2,duration:2,description:m.name})),subject:{category:'vehicle',label:'motorcycle'}},{creativePrompt:prompt,targetDuration:30,maxCuts:12});
 assert.ok(plan.cuts.length>0);
 assert.ok(plan.cuts.every(c=>Number(c.duration)>0));
}
console.log('DIRECTOR ADVERSARIAL MATRIX PASS');
