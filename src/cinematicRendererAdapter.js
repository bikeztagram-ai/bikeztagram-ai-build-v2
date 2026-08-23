/* Batch 92 renderer adapter: normalises the orchestration output without replacing the protected renderer. */
export function adaptCinematicPlanForRenderer(plan={}){
 const cuts=Array.isArray(plan.cuts)?plan.cuts:[];
 return {
  ...plan,
  cuts:cuts.map((cut,i)=>({
   ...cut,
   startTime:Number(cut.startTime)||0,
   duration:Math.max(.35,Number(cut.duration)||2),
   transition:i===0?(cut.transition||'fade-in'):(cut.transition||'hard-cut'),
   motionStyle:cut.motionStyle||'slow-push',
   motionIntensity:Number(cut.motionIntensity)||.8,
   colorGrade:cut.colorGrade||'moody cinematic',
   stabilization:cut.stabilization!==false
  })),
  renderContract:{version:'cinematic-render-v1',continuous:true,beatAware:Boolean(plan?.production?.beatAware),qaRequired:true}
 };
}
