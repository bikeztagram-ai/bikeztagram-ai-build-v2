/* Audio mix policy: preserve source audio while giving the original soundtrack a cinematic bed. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
export function buildCinematicAudioMix({energy=.72,hasSourceAudio=true}={}){
 const e=clamp(energy,.2,1);
 return {version:'cinematic-mix-v1',music:{gain:clamp(.58+e*.12,.52,.72),fadeIn:.35,fadeOut:.65,duckUnderSource:hasSourceAudio,duckGain:hasSourceAudio?.28:1},source:{gain:hasSourceAudio?.72:0,fadeIn:.12,fadeOut:.35},master:{targetLoudness:'social-cinematic',limiter:true,peakCeiling:.96}};
}
