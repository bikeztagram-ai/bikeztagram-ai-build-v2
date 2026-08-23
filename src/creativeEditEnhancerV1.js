/* Creative Edit Enhancer V1: turns directed transition intent into renderer-neutral editorial effects. */
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function enhanceCreativeCuts(cuts=[],{duration=15,music={}}={}){
 const list=Array.isArray(cuts)?cuts:[], total=Math.max(.35,n(duration,15));
 return list.map((cut,i)=>{
  const purpose=String(cut.purpose||cut.role||'').toLowerCase();
  const energy=n(cut.energy,music?.energy??.7);
  const action=purpose.includes('action')||purpose.includes('chase');
  const reveal=purpose.includes('reveal');
  const hero=purpose.includes('hero');
  const generated=cut.sourceType==='generated'||cut.generated===true;
  const effects={
   zoom: hero||reveal ? clamp(.018+(energy*.025),.018,.05) : action ? clamp(.012+(energy*.018),.012,.035) : 0,
   pan: cut.camera?.movement||cut.motion|| (action?'forward':'none'),
   speed: action ? clamp(1.05+energy*.35,1.05,1.4) : 1,
   emphasis: hero?'hero':reveal?'reveal':action?'action':'cinematic'
  };
  const transition=cut.transition|| (i?'cut':'cut');
  const transitionDuration=transition==='crossfade'||transition==='cinematic-dissolve'?clamp(.18+(1-energy)*.3,.18,.48):transition==='flash-cut'?0.06:transition==='whip'?.12:0;
  return {...cut,editorial:{effects,transition,transitionDuration,generatedContinuityCheck:generated},editReason:`${effects.emphasis} shot treatment; ${transition} transition`};
 });
}
export function validateEnhancedCuts(cuts=[]){return {pass:Array.isArray(cuts)&&cuts.length>0&&cuts.every(c=>c.editorial?.effects&&typeof c.editorial.transitionDuration==='number'),count:Array.isArray(cuts)?cuts.length:0};}
