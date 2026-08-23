import {buildProductionBridge} from './productionBridge.js';
import {buildCinematicProductionV2} from './cinematicProductionV2.js';
import {buildLongFormMusicComposition} from './musicCompositionV3.js';

/* Keeps the existing App/render path stable while feeding the new V2 production contracts. */
export function prepareCinematicRender({sources=[],plan={},prompt='',targetDuration=15,music=null}={}){
 const bridge=buildProductionBridge({mediaItems:sources,editPlan:plan,prompt,duration:targetDuration,bpm:music?.bpm||112,energy:music?.energy||.72,mood:music?.mood||'cinematic',hasSourceAudio:sources.some(s=>s?.type==='video'||String(s?.mimeType||'').startsWith('video/'))});
 const composition=buildLongFormMusicComposition({duration:Number(targetDuration)||15,prompt,genre:music?.genre,mood:music?.mood||'cinematic',energy:music?.energy||.72,filmType:plan?.filmType||'trailer'});
 const v2=buildCinematicProductionV2({cuts:bridge.decisions?.cuts||bridge.production?.cuts||[],duration:Number(targetDuration)||15,composition,music:music||{}});
 bridge.productionV2=v2;
 if(v2?.render?.cuts?.length)bridge.renderPlan={...bridge.renderPlan,...v2.render,cuts:v2.render.cuts,timeline:v2.render.timeline,renderContract:v2.render};
 if(music?.audioAvailable)bridge.renderPlan.music={...music,...bridge.renderPlan.music};
 return bridge;
}
