/* Shared editorial policy for batches 84-87. */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
export function directCinematicEdits(cuts=[],soundtrack={}){
 const beats=Array.isArray(soundtrack.beatGrid)?soundtrack.beatGrid:[];
 return cuts.map((cut,i)=>{
  const purpose=String(cut?.purpose||'').toLowerCase();
  const section=String(cut?.section||'').toLowerCase();
  const action=/action|chase|race|speed|impact/.test(purpose);
  const reveal=/reveal|hero/.test(purpose+' '+section);
  const transition=i===0?'fade-in':reveal?'flash-cut':action?(i%2?'whip-right':'whip-left'):(section==='build'?'crossfade':'hard-cut');
  const beat=beats.length?beats.reduce((best,b)=>Math.abs(b-cut.startTime)<Math.abs(best-cut.startTime)?b:best,beats[0]):null;
  return {...cut,transition,beatCut:Boolean(beat),beatTime:beat?.time??null,motionStyle:cut.motionStyle|| (action?'push-pan':'slow-push'),motionIntensity:clamp(cut.motionIntensity??(action?1.15:.78),.35,1.5)};
 });
}
