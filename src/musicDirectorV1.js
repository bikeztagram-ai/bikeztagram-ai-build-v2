/* Original AI Music Director V1: converts film intent into an executable musical blueprint. */
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lower=v=>String(v||'').toLowerCase();
const chooseGenre=p=>/motorcycle|bike|race|action|chase|speed/.test(p)?'cinematic-electronic':/romantic|emotional|sunset|journey/.test(p)?'cinematic-ambient':'cinematic-hybrid';
const chooseBpm=p=>/action|chase|race|speed|aggressive|intense/.test(p)?128:/slow|moody|emotional|dramatic/.test(p)?92:112;
export function directMusic({prompt='',duration=15,energy=.78,style='cinematic',shotPlan=[]}={}){
 const p=lower(`${prompt} ${style}`),seconds=clamp(n(duration,15),5,120),bpm=chooseBpm(p),bars=Math.max(2,Math.ceil(seconds/(60/bpm*4))),base=clamp(n(energy,.78),.2,1);
 const action=/action|chase|race|speed|aggressive|impact/.test(p),dark=/dark|noir|moody|night/.test(p),reveal=/reveal|hero|trailer|cinematic/.test(p);
 const sections=[];const names=bars<=3?['intro','build','hero']:['intro','build','rise','drop','hero','outro'];
 const weights=names.map((name,i)=>({name,i,weight:name==='intro'?.13:name==='build'?.18:name==='rise'?.17:name==='drop'?.2:name==='hero'?.24:.08}));let cursor=0;const totalW=weights.reduce((s,x)=>s+x.weight,0);
 for(const x of weights){const d=seconds*x.weight/totalW;sections.push({name:x.name,start:Number(cursor.toFixed(3)),duration:Number(d.toFixed(3)),energy:clamp(base*(x.name==='drop'||x.name==='hero'?1.08:x.name==='intro'?.62:x.name==='build'?.82:1),.2,1),density:x.name==='intro'?'sparse':x.name==='drop'||x.name==='hero'?'full':'building'});cursor+=d;}
 const beats=[];const beat=60/bpm;for(let t=0;t<seconds;t+=beat){const section=sections.reduce((best,s)=>t>=s.start? s:best,sections[0]);beats.push({time:Number(t.toFixed(3)),downbeat:Math.round(t/beat)%4===0,energy:section.energy,section:section.name});}
 const motif=dark?'minor-dark':action?'driving-pulse':reveal?'heroic-rise':'cinematic-motif';
 return {version:'music-director-v1',originalOnly:true,genre:chooseGenre(p),bpm,seconds,energy:base,motif,sections,beats,instrumentation:{drums:action?'hybrid-impact':'cinematic-percussion',bass:action?'driving-sub':'subtle-pulse',harmony:dark?'dark-synth-pads':'hybrid-pads',lead:reveal?'wide-synth-lead':'restrained-motif',texture:'original-designed-sound'},mix:{headroomDb:-1,duckingAgainstSpeech:true,targetLufs:-14},shotSync:Array.isArray(shotPlan)?shotPlan.map((s,i)=>({shotIndex:i,start:n(s.startTime,s.start||0),duration:n(s.duration,2),energy:lower(s.purpose||'').includes('action')?1:.72,accent:lower(s.purpose||'').includes('reveal')||lower(s.purpose||'').includes('hero')})):[]};
}
