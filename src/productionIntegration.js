import { buildProductionBridge } from './productionBridge.js';

/*
 * Keeps the existing App/render path stable while allowing the cinematic
 * director to enrich a render plan. The caller can opt in explicitly.
 */
export function prepareCinematicRender({sources=[],plan={},prompt='',targetDuration=15,music=null}={}){
 const bridge=buildProductionBridge({mediaItems:sources,editPlan:plan,prompt,duration:targetDuration,bpm:music?.bpm||112,energy:music?.energy||.72,mood:music?.mood||'cinematic',hasSourceAudio:sources.some(s=>s?.type==='video'||String(s?.mimeType||'').startsWith('video/'))});
 if(music?.audioAvailable)bridge.renderPlan.music={...music,...bridge.renderPlan.music};
 return bridge;
}
