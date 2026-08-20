/* BIKEZTAGRAM AI — beat-aware timeline adapter.
   Keeps the renderer contract unchanged while adding optional music timing metadata.
   Timeline timing is kept separate from source-media timing so real footage offsets remain authoritative.
*/
import { alignCutsToMusic, buildSoundtrackBrief } from './musicDirector.js';

function number(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}

export function attachSoundtrackToPlan(plan, soundtrack){
  const brief=soundtrack?.beatGrid ? soundtrack : buildSoundtrackBrief({prompt:plan?.creativePrompt||'',duration:plan?.targetDuration||plan?.duration||15,bpm:soundtrack?.bpm,genre:soundtrack?.genre,mood:soundtrack?.mood,energy:soundtrack?.energy});
  const sourceScenes=Array.isArray(plan?.scenes)?plan.scenes:[];
  const sourceCuts=Array.isArray(plan?.cuts)&&plan.cuts.length ? plan.cuts : sourceScenes.map((scene,index)=>({
    id:scene?.id||`scene-${index+1}`,
    startTime:0,
    endTime:number(scene?.duration,.5),
    duration:number(scene?.duration,.5),
    sceneIndex:index,
    purpose:scene?.purpose||'cinematic-scene'
  }));
  const cuts=alignCutsToMusic(sourceCuts,brief);
  const musicReplacementMap=buildMusicReplacementMap(brief);
  const scenes=sourceScenes.length ? sourceScenes.map((scene,index)=>{
    const cut=cuts[index];
    if(!cut)return scene;
    return {...scene,
      duration:Number(cut.duration.toFixed(3)),
      editorialStartTime:Number(cut.startTime.toFixed(3)),
      editorialEndTime:Number(cut.endTime.toFixed(3)),
      music:{beatAligned:true,startBeat:cut.music?.startBeat??null,endBeat:cut.music?.endBeat??null}
    };
  }) : sourceScenes;
  const plannedDuration=cuts.reduce((sum,cut)=>sum+number(cut.duration,0),0);
  return {...plan,
    music:{...brief,enabled:true,role:'editorial-timing',replacementMap:musicReplacementMap},
    cuts,
    scenes,
    plannedDuration:Number(plannedDuration.toFixed(3)),
    musicSyncVersion:'beat-aware-v2'
  };
}

export function buildMusicReplacementMap(soundtrack){
  const grid=soundtrack?.beatGrid?.beats||[];
  return {version:'music-replacement-map-v1',bpm:Number(soundtrack?.bpm)||120,duration:Number(soundtrack?.duration)||0,beats:grid.map(b=>({time:b.time,bar:b.bar,beat:b.beat,downbeat:b.downbeat})),instruction:'Replace only with a suitably licensed track whose tempo and musical phrasing are compatible with this editorial grid; re-run beat analysis when the replacement track differs materially.'};
}
