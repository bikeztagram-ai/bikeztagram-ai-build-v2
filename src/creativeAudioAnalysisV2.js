/* Bikeztagram AI — creative audio analysis V2.
 * Converts generated/available track metadata into an editorial event map.
 * The interface is ready for real waveform/audio-feature extraction later;
 * it never pretends metadata is measured audio when it is only planned.
 */

const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,n(v,min)));

export function buildEditorialAudioMap({duration=15,bpm=120,beats=[],sections=[],energyEvents=[],drops=[]}={}){
  const safeDuration=Math.max(.5,n(duration,15));
  const safeBpm=clamp(bpm,40,220);
  const beatList=(Array.isArray(beats)?beats:[]).map((time,index)=>({time:n(time),index})).filter(b=>b.time>=0&&b.time<=safeDuration);
  const events=[
    ...(Array.isArray(sections)?sections.map(s=>({time:n(s.start),type:'section',kind:s.id||'section',strength:1})):[]),
    ...(Array.isArray(energyEvents)?energyEvents.map(e=>({time:n(e.time),type:e.type||'energy',kind:e.kind||e.type||'energy',strength:clamp(e.strength,0,1)})):[]),
    ...(Array.isArray(drops)?drops.map(d=>({time:n(d.time),type:'drop',kind:d.kind||'drop',strength:clamp(d.strength,0,1)})):[]),
  ].filter(e=>e.time>=0&&e.time<=safeDuration).sort((a,b)=>a.time-b.time);
  return {version:'editorial-audio-map-v2',duration:safeDuration,bpm:safeBpm,beats:beatList,events,source:'metadata-or-analysis-input',measuredAudio:false};
}

export function snapTimeToBeat(time,{beats=[]}={}){
  const target=n(time);
  if(!beats.length)return target;
  return beats.reduce((best,b)=>Math.abs(b.time-target)<Math.abs(best.time-target)?b:best,beats[0]).time;
}

export function chooseVisualEventTargets(audioMap,{maxTargets=12,minGap=.35}={}){
  const candidates=(audioMap?.events||[]).filter(e=>e.type==='drop'||e.type==='energy'||e.type==='section');
  const result=[];
  for(const event of candidates){if(result.every(x=>Math.abs(x.time-event.time)>=minGap)){result.push({...event,time:snapTimeToBeat(event.time,audioMap)});if(result.length>=maxTargets)break;}}
  return result;
}

export function buildAudioAnalysisRequest({audioRef,includeWaveform=true,includeOnsets=true,includeBeats=true,includeEnergy=true}={}){
  return {version:'audio-analysis-request-v1',audioRef:audioRef||null,features:{waveform:Boolean(includeWaveform),onsets:Boolean(includeOnsets),beats:Boolean(includeBeats),energy:Boolean(includeEnergy)}};
}
