/* Universal render runtime: production acceptance wrapper around the existing renderer/QA loop. */
import { renderInspectImprove } from './renderQualityLoop.js';
import { buildMusicRenderBridge, scoreMusicEditSync } from './musicRenderBridge.js';
import { evaluateRenderAcceptance, chooseRevisionActions } from './renderQualityPolicy.js';
export async function renderUniversalProduction({media=[],mediaItems=null,plan,prompt='',duration=15,music=true,outputPreset='reel',onProgress}={}){
 if(!plan)throw new Error('A render plan is required.');
 const resolvedMediaItems=Array.isArray(mediaItems)?mediaItems:media;
 if(!Array.isArray(resolvedMediaItems)||!resolvedMediaItems.length)throw new Error('Universal production render requires media items.');
 const musicBridge=music?await buildMusicRenderBridge({creativePrompt:prompt,duration,cuts:plan.cuts||plan.clips||[]}):null;
 const musicAudioUrl=musicBridge?.renderAudio?.audioDataUrl||null;
 const renderPlan=musicBridge?{...plan,audioAnalysis:musicBridge.composition?.events,beatGrid:musicBridge.beatGrid,music:{...(plan.music||{}),audioDataUrl:musicAudioUrl,audioAnalysis:musicBridge.composition?.events,beatGrid:musicBridge.beatGrid}}:plan;
 const result=await renderInspectImprove({mediaItems:resolvedMediaItems,plan:renderPlan,expectedDuration:duration,prompt,outputPreset,musicUrl:musicAudioUrl,onProgress});
 const beatSyncScore=musicBridge?scoreMusicEditSync(musicBridge):null;
 const policy=evaluateRenderAcceptance({qa:result?.qa,audioExpected:Boolean(music),audioAttached:Boolean(result?.audioAttached),beatSyncScore});
 return {...result,musicBridge,acceptance:policy,revisionActions:chooseRevisionActions(policy),accepted:policy.accepted};
}
