/* Universal render runtime: production acceptance wrapper around the existing renderer/QA loop. */
import { renderInspectImprove } from './renderQualityLoop.js';
import { buildMusicRenderBridge, scoreMusicEditSync } from './musicRenderBridge.js';
import { evaluateRenderAcceptance, chooseRevisionActions } from './renderQualityPolicy.js';

export async function renderUniversalProduction({media=[],plan,prompt='',duration=15,music=true,outputPreset='reel'}={}){
  if(!plan) throw new Error('A render plan is required.');
  const musicBridge=music?buildMusicRenderBridge({creativePrompt:prompt,duration,cuts:plan.cuts||plan.clips||[]}):null;
  const musicAudioUrl=musicBridge?.renderAudio?.audioDataUrl||null;
  const renderPlan=musicBridge?{...plan,audioAnalysis:musicBridge.composition?.events,beatGrid:musicBridge.beatGrid}:plan;
  const result=await renderInspectImprove({media,plan:renderPlan,prompt,outputPreset,musicUrl:musicAudioUrl});
  const beatSyncScore=musicBridge?scoreMusicEditSync(musicBridge):null;
  const policy=evaluateRenderAcceptance({qa:result?.qa,audioExpected:Boolean(music),audioAttached:Boolean(musicAudioUrl||result?.audioAttached),beatSyncScore});
  return {...result,musicBridge,acceptance:policy,revisionActions:chooseRevisionActions(policy),accepted:policy.accepted};
}
