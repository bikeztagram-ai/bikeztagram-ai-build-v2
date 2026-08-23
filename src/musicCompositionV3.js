/* Music Composition V3: composition blueprint for provider-grade generation.
 * This deliberately separates composition from the current local WAV fallback.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||a));
const structures={short:['intro','build','impact','hero','outro'],trailer:['intro','theme','build','pre-impact','impact','hero','outro'],song:['intro','verse-a','pre-chorus','chorus','verse-b','bridge','final-chorus','outro'],score:['atmosphere','theme','development-a','development-b','breath','escalation','climax','resolution']};
export function chooseMusicStructure({duration=30,filmType='trailer',prompt=''}={}){
 const d=clamp(duration,15,3600),p=String(prompt).toLowerCase();
 if(d<=35)return 'short';
 if(p.includes('song')||p.includes('vocal'))return 'song';
 if(p.includes('score')||p.includes('documentary')||p.includes('film'))return 'score';
 return filmType==='song'?'song':d>120?'score':'trailer';
}
export function buildLongFormMusicComposition({duration=30,prompt='',genre='cinematic',mood='cinematic',energy=.72,filmType='trailer'}={}){
 const total=clamp(duration,15,3600),structure=chooseMusicStructure({duration:total,filmType,prompt}),names=structures[structure];
 const weights=structure==='score'?[.08,.1,.12,.14,.08,.16,.18,.14]:structure==='song'?[.08,.16,.08,.16,.16,.12,.18,.06]:structure==='trailer'?[.08,.12,.18,.12,.14,.26,.1]:[.1,.16,.24,.28,.16];
 let cursor=0;const sections=names.map((name,i)=>{const start=cursor,end=i===names.length-1?total:Number((cursor+total*weights[i]).toFixed(3));cursor=end;return{id:`${name}-${i+1}`,name,start,end,duration:Number((end-start).toFixed(3)),energy:Number(clamp(energy+(name.includes('impact')||name.includes('climax')||name.includes('chorus')?.16:0)- (name==='breath'?.25:0),.2,1).toFixed(3)),purpose:name};});
 return {version:'music-composition-v3',original:true,duration:total,genre,mood,energy,structure,sections,theme:{type:'original-motif',development:true,variationEveryBars:8},production:{drums:true,bass:true,harmony:true,lead:true,texture:true,transitions:true,stereoDepth:true,dynamics:true,mix:true,master:true},generation:{providerNeutral:true,requiresProviderForProfessionalAudio:true,localFallbackAllowed:true},copyright:{originalOnly:true,noNamedSongImitation:true,noReproductionOfExistingMelodies:true},creativeRequest:prompt||'Compose an original professionally produced soundtrack for the film.'};
}
export function buildMusicGenerationPlan(args={}){const composition=buildLongFormMusicComposition(args);return {...composition,providerRequest:{duration:composition.duration,sections:composition.sections,genre:composition.genre,mood:composition.mood,energy:composition.energy,production:composition.production,originality:composition.copyright}};}
