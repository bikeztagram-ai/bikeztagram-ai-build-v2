/* BIKEZTAGRAM AI — beat-aware timeline adapter.
   Keeps the renderer contract unchanged while adding optional music timing metadata.
*/
import { alignCutsToMusic, buildSoundtrackBrief } from './musicDirector.js';

export function attachSoundtrackToPlan(plan, soundtrack){
  const brief=soundtrack?.beatGrid ? soundtrack : buildSoundtrackBrief({prompt:plan?.creativePrompt||'',duration:plan?.targetDuration||plan?.duration||15,bpm:soundtrack?.bpm,genre:soundtrack?.genre,mood:soundtrack?.mood,energy:soundtrack?.energy});
  const cuts=alignCutsToMusic(plan?.cuts||[],brief);
  return {...plan,music:{...brief,enabled:true,role:'editorial-timing'},cuts,musicSyncVersion:'beat-aware-v1'};
}

export function buildMusicReplacementMap(soundtrack){
  const grid=soundtrack?.beatGrid?.beats||[];
  return {version:'music-replacement-map-v1',bpm:Number(soundtrack?.bpm)||120,duration:Number(soundtrack?.duration)||0,beats:grid.map(b=>({time:b.time,bar:b.bar,beat:b.beat,downbeat:b.downbeat})),instruction:'Replace only with a suitably licensed track whose tempo and musical phrasing are compatible with this editorial grid; re-run beat analysis when the replacement track differs materially.'};
}
