/* AI Fill Planner V1: identifies editorially required missing shots and turns them into provider-neutral generation jobs. */
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const text=v=>String(v||'').trim();
const missing=s=>Boolean(s?.missing||s?.sourceType==='missing'||s?.sourceType==='generated-needed'||(!s?.mediaId&&s?.requiredShot));
export function planMissingShots(scenes=[],context={}){
 const list=Array.isArray(scenes)?scenes:[];
 return list.map((scene,index)=>({scene,index})).filter(x=>missing(x.scene)).map(({scene,index})=>({
  jobId:`fill-${index+1}`,
  sceneIndex:index,
  role:text(scene.purpose||scene.role)||'cinematic insert',
  duration:Math.max(.75,n(scene.duration,3)),
  prompt:text(scene.requiredShot||scene.generationPrompt||scene.prompt||scene.purpose)||'cinematic establishing shot',
  aspectRatio:scene.aspectRatio||context.aspectRatio||'9:16',
  referenceAssets:scene.referenceAssets||context.referenceAssets||[],
  subjectIds:scene.subjectIds||context.subjectIds||[],
  continuity:{previousSceneId:scene.previousSceneId||null,nextSceneId:scene.nextSceneId||null,matchSubjectIdentity:true,matchEnvironment:true,matchLighting:true,matchCameraLanguage:true},
  constraints:{originalOnly:true,noCopyrightStyleImitation:true,noSubjectIdentityDrift:true},
  camera:scene.camera||scene.motionStyle||'cinematic natural movement',
  lighting:scene.lighting||'match neighbouring shots',
  environment:scene.environment||'match neighbouring shots'
 }));
}
export function mergeGeneratedFillResults(scenes=[],results=[]){
 const byIndex=new Map((Array.isArray(results)?results:[]).map(r=>[Number(r.sceneIndex),r]));
 return (Array.isArray(scenes)?scenes:[]).map((scene,index)=>{const r=byIndex.get(index);return r?{...scene,mediaId:r.id||`generated-${index}`,sourceType:'generated',generated:true,missing:false,generationPrompt:r.request?.prompt||scene.generationPrompt||scene.requiredShot||scene.prompt||'',generationResult:r}:scene;});
}
export function validateFillPlan(plan=[]){return {pass:Array.isArray(plan)&&plan.every(j=>j.jobId&&j.prompt&&j.constraints?.originalOnly&&j.constraints?.noCopyrightStyleImitation),count:Array.isArray(plan)?plan.length:0};}
