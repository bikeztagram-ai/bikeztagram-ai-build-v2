/* Professional original-music readiness gate. Provider-neutral: never hard-code a vendor into Creative Engine architecture. */
const REQUIRED=['audio','sections','motif','development','dynamics','mix','master','beatGrid'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||a));
export function assessProfessionalMusic(track={}){
 const composition=track.composition||track;
 const sections=Array.isArray(composition.sections)?composition.sections:[];
 const arrangement=composition.arrangement||{};
 const audio=Boolean(track.audioDataUrl||track.audioBlob||track.audioUrl||track.audioAvailable);
 const checks={audio,sections:sections.length>=4,motif:Boolean(composition.theme?.type),development:Boolean(composition.theme?.development),dynamics:Boolean(arrangement.dynamics),mix:Boolean(arrangement.stereoDepth),master:Boolean(arrangement.master),beatGrid:Boolean(track.beatGrid||track.audioAnalysis?.beatGrid)};
 const passed=Object.values(checks).filter(Boolean).length;
 const score=Math.round((passed/REQUIRED.length)*100);
 return {version:'professional-music-gate-v1',score,professionalReady:score>=90,checks,missing:REQUIRED.filter(key=>!checks[key]),fallbackAllowed:true,fallbackIsFinal:false};
}
export function buildProviderMusicRequest({prompt='',duration=30,genre='cinematic',mood='cinematic',energy=.75,bpm=112,filmType='trailer'}={}){
 return {version:'professional-original-music-request-v1',prompt,duration:clamp(duration,15,3600),genre,mood,energy,bpm,filmType,originalOnly:true,requiresOriginalComposition:true,requiresBeatGrid:true,requiresSectionDevelopment:true,requiresMixAndMaster:true,preferredOutputs:['master','instrumental','stems','metadata'],noNamedSongImitation:true};
}
