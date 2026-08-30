/* BIKEZTAGRAM AI — deterministic bridge from editorial intent to renderer cues. */
const ROLE_DEFAULTS={
  hook:{motionStyle:'push',motionIntensity:1.15,transition:'fade-in',cameraIntent:'immediate-attention'},
  build:{motionStyle:'slow-push',motionIntensity:.9,transition:'hard-cut',cameraIntent:'controlled-cinematic'},
  action:{motionStyle:'pan-right',motionIntensity:1.25,transition:'whip-right',cameraIntent:'escalate-motion'},
  reveal:{motionStyle:'slow-push',motionIntensity:1,transition:'dip-black',cameraIntent:'controlled-reveal'},
  'hero-ending':{motionStyle:'slow-pull',motionIntensity:.85,transition:'fade-out',cameraIntent:'hold-and-settle'}
};
const ROLE_ALIASES={hero:'hero-ending',ending:'hero-ending',outro:'hero-ending',intro:'hook',opening:'hook'};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const normRole=(value)=>{const key=String(value||'').trim().toLowerCase();return ROLE_ALIASES[key]||key;};
export function inferEditorialRole(cut,index=0,count=1){
  const explicit=normRole(cut?.role||cut?.editorialRole||cut?.purpose);
  if(ROLE_DEFAULTS[explicit])return explicit;
  if(index===0)return 'hook';
  if(index===count-1&&count>1)return 'hero-ending';
  const text=String(cut?.purpose||cut?.intent||'').toLowerCase();
  if(/action|chase|race|speed|impact|movement/.test(text))return 'action';
  if(/reveal/.test(text))return 'reveal';
  return 'build';
}
export function applyDirectorRenderCues(plan={}){
  const cuts=Array.isArray(plan.cuts)?plan.cuts:[];
  if(!cuts.length)return plan;
  const next=cuts.map((cut,index)=>{
    const role=inferEditorialRole(cut,index,cuts.length), defaults=ROLE_DEFAULTS[role];
    const explicitMotion=String(cut.motionStyle||'').trim();
    const explicitTransition=String(cut.transition||cut.transitionIn||'').trim();
    const intensity=clamp(Number(cut.motionIntensity)||defaults.motionIntensity,.35,1.6);
    return {...cut,role,editorialRole:role,motionStyle:explicitMotion||defaults.motionStyle,motionIntensity:intensity,cameraIntent:cut.cameraIntent||defaults.cameraIntent,transition:explicitTransition||defaults.transition,transitionIn:explicitTransition||defaults.transition,stabilization:cut.stabilization!==false,directorExecution:{version:'director-render-runtime-v1',role,cameraIntent:cut.cameraIntent||defaults.cameraIntent,motionStyle:explicitMotion||defaults.motionStyle,motionIntensity:intensity,transition:explicitTransition||defaults.transition}};
  });
  return {...plan,cuts:next,directorRuntime:{version:'director-render-runtime-v1',applied:true,cutCount:next.length,roles:next.map(c=>c.role)}};
}
export function validateDirectorRenderCues(plan={}){
  const cuts=Array.isArray(plan.cuts)?plan.cuts:[];
  const errors=[];
  cuts.forEach((cut,index)=>{
    if(!ROLE_DEFAULTS[normRole(cut.role)])errors.push(`cut-${index}-invalid-role`);
    if(!cut.motionStyle)errors.push(`cut-${index}-missing-motion`);
    if(!cut.cameraIntent)errors.push(`cut-${index}-missing-camera-intent`);
    if(!cut.transition)errors.push(`cut-${index}-missing-transition`);
    if(Number(cut.motionIntensity)<.35||Number(cut.motionIntensity)>1.6)errors.push(`cut-${index}-invalid-intensity`);
  });
  return {ok:errors.length===0,errors};
}
