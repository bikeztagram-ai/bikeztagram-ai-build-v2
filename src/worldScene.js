/* BIKEZTAGRAM AI — zero-cost universal world scene adapter.
   No remote model, no remote asset, no external AI provider.
*/
import { renderCreativeScene, buildCreativeScenePlan } from './universalCreativeSceneEngine.js';

export async function renderWorldScene({file,sourceUrl,prompt='',duration=8,onProgress}={}){
  const plan=buildCreativeScenePlan(prompt,{shots:Math.max(3,Math.ceil(Number(duration||8)/1.6))});
  const result=await renderCreativeScene({prompt,duration,width:720,height:1280,fps:30,onProgress});
  if(!(result?.blob instanceof Blob)||!result.blob.size) throw new Error('Creative world renderer returned an empty video.');
  return result.blob;
}

export { buildCreativeScenePlan };
