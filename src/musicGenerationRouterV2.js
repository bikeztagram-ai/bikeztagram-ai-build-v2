import {buildMusicProviderRequest,validateMusicProviderResult} from './musicProviderContractV2.js';
import {createOriginalMusicWav} from './musicProvider.js';
export function buildMusicGenerationRequest(composition,options={}){return buildMusicProviderRequest(composition,options);}
export async function generateMusicWithProvider({composition,provider,options={}}={}){
 const request=buildMusicGenerationRequest(composition,options);
 if(typeof provider==='function'){
  const result=await provider(request);
  const validation=validateMusicProviderResult(result,composition.duration);
  if(validation.pass)return {...result,validation,source:'professional-provider',request};
 }
 const blob=createOriginalMusicWav(composition.duration,composition.bpm||112,{genre:composition.genre,energy:composition.energy,seed:composition.creativeRequest||'bikeztagram'});
 return {audioBlob:blob,duration:composition.duration,source:'local-fallback',validation:validateMusicProviderResult({audioBlob:blob,duration:composition.duration},composition.duration),request};
}
