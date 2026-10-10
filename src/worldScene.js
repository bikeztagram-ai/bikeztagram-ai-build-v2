/* BIKEZTAGRAM AI — zero-cost game-scene adapter.
   The prompt-only prototype uses a detailed procedural renderer; it does not claim
   to be AI-generated or photorealistic. Real video-model integration is separate.
*/
import { renderDetailedGameScene } from './detailedGameSceneRenderer.js';
import { buildCreativeScenePlan } from './universalCreativeSceneEngine.js';

export async function renderWorldScene({file,sourceUrl,prompt='',duration=8,width=720,height=1280,fps=24,onProgress}={}){
  if(file||sourceUrl) throw new Error('The prompt-only game scene renderer does not use source footage yet.');
  const blob=await renderDetailedGameScene({prompt,duration,width,height,fps,onProgress});
  if(!(blob instanceof Blob)||!blob.size) throw new Error('Detailed game-scene renderer returned an empty video.');
  return blob;
}

export { buildCreativeScenePlan };
