/* BIKEZTAGRAM AI — cinematic soundtrack planning layer.
   Produces a structured soundtrack map for the renderer/editor while keeping
   audio generation original and deterministic. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));

export function buildCinematicSoundtrack({duration=15,bpm=112,energy=.72,mood='cinematic',prompt=''}={}){
  const total=clamp(duration,5,180), safeBpm=clamp(bpm,70,160), beat=60/safeBpm, bar=beat*4;
  const count=Math.max(3,Math.ceil(total/bar));
  const names=['intro','build','reveal','drive','hero'];
  const sections=[];
  for(let i=0;i<count;i++){
    const start=i*bar,end=Math.min(total,(i+1)*bar);
    const phase=i/count;
    let role=i===0?'intro':phase<.35?'build':phase<.58?'reveal':phase<.82?'drive':'hero';
    sections.push({id:`section-${i+1}`,role,start,duration:end-start,bpm:safeBpm,energy:clamp(.42+phase*.46+Number(energy)*.12,.35,.98),texture:role==='intro'?'atmosphere':role==='build'?'pulse':role==='reveal'?'impact':role==='drive'?'full-groove':'hero-lift'});
  }
  const beats=[];for(let t=0;t<total;t+=beat)beats.push(Number(t.toFixed(4)));
  return {duration:total,bpm:safeBpm,beatDuration:beat,beatGrid:beats,sections,mood:String(mood||'cinematic'),prompt:String(prompt||''),copyrightSafe:true,source:'original-cinematic-section-plan'};
}

export function soundtrackSectionAt(map,time){
  return map?.sections?.find(s=>time>=s.start&&time<s.start+s.duration)||map?.sections?.[map.sections.length-1]||null;
}
