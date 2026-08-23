import {buildProviderMusicRequest,validateProviderMusicResponse} from './musicProviderContractV3.js';

export function buildCreativeMusicRequest({job={},director={},duration}={}){
  const total=Number(duration||job.duration||director.duration||30);
  return buildProviderMusicRequest({duration:total,prompt:job.prompt||director.prompt||'',genre:job.genre||director.genre||'cinematic',mood:job.mood||director.mood||'cinematic',energy:job.energy??director.energy??.72,bpm:job.bpm||director.bpm||112,filmType:job.filmType||director.filmType||'trailer'});
}

export function attachMusicResultToCreativeContext(context={},result,request){
  const expectedDuration=Number(request?.duration||context.duration||30);
  const checked=validateProviderMusicResponse(result,{duration:expectedDuration});
  return {...context,duration:expectedDuration,music:{...checked,request,ready:Boolean(checked.valid),professionalMaster:Boolean(checked.valid&&result?.providerGrade!==false),analysisRequired:Boolean(checked.valid),beatSyncRequired:Boolean(checked.valid)}};
}

export function musicCanEnterProduction(context={}){
  const music=context.music||{};
  return Boolean(music.ready&&music.audioAvailable&&Number(music.duration)>=Number(context.duration||0)&&music.analysisRequired&&music.beatSyncRequired);
}
