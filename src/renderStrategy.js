/* BIKEZTAGRAM AI — safe production-to-render bridge. Generated scenes stay opt-in until the compositor can anchor the real subject. */
const n=(v,f)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function buildSafeRenderPlan({productionPlan,aiPlan,sourceDuration=15,creativePrompt=''}) {
  if (!productionPlan?.scenes?.length) return aiPlan || null;
  const fallbackCuts=Array.isArray(aiPlan?.cuts)?aiPlan.cuts:[];
  let fallbackIndex=0;
  const cuts=productionPlan.scenes.map((scene,index)=>{
    const uploaded=scene.sourceType==='uploaded';
    if(uploaded) return {
      mediaIndex:0,mediaId:'video-0',startTime:Math.max(0,n(scene.startTime,0)),duration:Math.max(.5,n(scene.duration,1.5)),
      purpose:scene.purpose||'real-footage',sourceType:'uploaded',generated:false,generationPrompt:'',
      transition:scene.transitionIn||(index===0?'fade-in':'crossfade'),motionStyle:scene.motionStyle||'static',motionIntensity:clamp(n(scene.motionIntensity,.35),0,.6),
      speed:clamp(n(scene.speed,1),.5,1.5),speedEnd:clamp(n(scene.speedEnd,1),.5,1.5),colorGrade:scene.colorGrade||'cinematic',stabilization:true,text:scene.text||''
    };
    const fallback=fallbackCuts[fallbackIndex%Math.max(1,fallbackCuts.length)];
    fallbackIndex+=1;
    if(!fallback) return null;
    return {
      ...fallback,
      mediaIndex:0,mediaId:'video-0',sourceType:'uploaded',generated:false,generationPrompt:'',
      purpose:scene.purpose||fallback.purpose||'cinematic-build',
      startTime:Math.max(0,n(fallback.startTime,0)),
      duration:Math.max(.5,n(scene.duration,fallback.duration||1.5)),
      transition:scene.transitionIn||fallback.transition||'crossfade',
      motionStyle:fallback.motionStyle==='static'?'static':fallback.motionStyle,
      motionIntensity:clamp(n(fallback.motionIntensity,.35),0,.6),
      coverage:{...(fallback.coverage||{}),generatedSceneFallback:true,reason:'real-subject-anchor-not-yet-supported'}
    };
  }).filter(Boolean);
  if(!cuts.length) return aiPlan||null;
  return {
    title:productionPlan.title||aiPlan?.title||'AI Director Production',
    style:productionPlan.style||aiPlan?.style||'cinematic',
    creativePrompt:productionPlan.creativeRequest||creativePrompt||aiPlan?.creativePrompt||'',
    colorGrade:productionPlan.style?.dark?'dark-cinematic':aiPlan?.colorGrade||'cinematic',
    cuts,duration:cuts.reduce((sum,c)=>sum+n(c.duration,0),0),targetDuration:n(productionPlan.targetDuration,sourceDuration),
    source:'bikeztagram-safe-production-bridge',generatedSceneFallbacks:productionPlan.scenes.filter(s=>s.sourceType==='generated').length
  };
}
