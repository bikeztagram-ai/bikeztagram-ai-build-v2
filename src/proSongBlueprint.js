/* BIKEZTAGRAM AI — professional original-song blueprint.
   This is an arrangement/specification layer: it does not copy named artists or songs.
*/
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
const txt=v=>String(v??'').trim();
export function buildProSongBlueprint({prompt='',genre='rock',mood='cinematic',bpm=108,duration=90,energy=.72}={}){
 const total=clamp(duration,30,480), safeBpm=clamp(bpm,60,180), safeEnergy=clamp(energy,0,1);
 const sections=[['intro',.06,.42],['verse-1',.14,.55],['pre-chorus',.08,.72],['chorus-1',.14,.92],['verse-2',.14,.62],['pre-chorus-2',.08,.78],['chorus-2',.14,.96],['bridge',.10,.58],['final-chorus',.10,1],['outro',.06,.35]];
 let cursor=0;
 const structure=sections.map(([id,share,relative])=>{const start=cursor;cursor=Math.min(total,cursor+total*share);return{id,start:Number(start.toFixed(3)),end:Number(cursor.toFixed(3)),energy:Number(clamp(relative*safeEnergy+.2,0,1).toFixed(3)),role:id.includes('chorus')?'memorable original hook':id==='bridge'?'contrast and lift':'develop and transform the original motif'};}).filter(s=>s.end>s.start);
 return {version:'pro-song-blueprint-v1',original:true,genre:txt(genre)||'rock',mood:txt(mood)||'cinematic',bpm:safeBpm,duration:total,energy:safeEnergy,creativePrompt:txt(prompt),structure,arrangement:{drums:'dynamic human-feel groove with fills at structural transitions',bass:'supportive melodic bassline that develops between sections',harmony:'original chord movement with controlled tension/release',lead:'distinct original motif with chorus variations',texture:'layered supporting textures that widen at major hooks',dynamics:'verse restraint → pre-chorus lift → chorus impact → bridge contrast → final chorus peak'},hook:{identity:'original melodic/rhythmic motif',repetition:'recognisable but varied',finale:'strongest statement with controlled resolution'},vocalDirection:{mode:'optional-original-vocal',verse:'conversational and intimate',chorus:'larger melodic range and memorable phrasing',bridge:'contrast in register or texture'},copyrightGuard:'No imitation of a named artist, recording, melody, lyrics, riff, or distinctive composition.'};
}
export function describeProSongBlueprint(b){return b?`Pro song blueprint: ${b.genre} • ${b.bpm} BPM • ${b.structure?.length||0} sections • original hook • ${b.duration}s`: 'No song blueprint.';}
