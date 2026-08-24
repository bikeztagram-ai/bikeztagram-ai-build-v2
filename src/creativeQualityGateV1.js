/* BIKEZTAGRAM AI — universal creative quality gate.
   Subject-agnostic by design: motorcycles are only one test dataset.
   It separates a usable local production sketch from professional final audio/video.
*/
const n=(v,f=0)=>{const x=Number(v);return Number.isFinite(x)?x:f};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const text=v=>String(v||'').toLowerCase();

const SUBJECTS=['motorcycle','motorbike','bike','car','vehicle','person','people','animal','pet','dog','cat','travel','landscape','city','product','fashion','food','architecture','nature','sport','drone','documentary','abstract'];
const VISUAL_COVERAGE=['establishing','wide','medium','close-up','detail','action','reaction','hero'];
const MUSIC_QUALITIES=['structure','motif','harmony','dynamics','rhythm','arrangement','variation','mix','master'];

function detectSubject(prompt='',media=[]) {
  const hay=text([prompt,...(Array.isArray(media)?media:[]).map(m=>m?.description||m?.subject||m?.type)].join(' '));
  return SUBJECTS.find(s=>hay.includes(s))||'universal';
}

export function scoreCreativeOutput({prompt='',media=[],cuts=[],music=null,generatedScenes=[]}={}) {
  const issues=[]; let visual=100, audio=100, generation=100;
  const subject=detectSubject(prompt,media);
  const list=Array.isArray(cuts)?cuts:[];
  const unique=new Set(list.map(c=>String(c.mediaId??c.mediaIndex??c.sourceId??'unknown'))).size;
  const roles=new Set(list.map(c=>text(c.role||c.editorialRole)));
  const descriptions=list.map(c=>text(c.description||c.reason||c.action));

  if(list.length<3){visual-=20;issues.push('insufficient visual coverage');}
  if(unique<Math.min(list.length,3)){visual-=12;issues.push('source variety is too low');}
  if(!roles.has('hook')){visual-=8;issues.push('missing hook');}
  if(!roles.has('hero-ending')&&!roles.has('payoff')){visual-=8;issues.push('missing final payoff');}
  const repeated=descriptions.filter((d,i)=>i>0&&d&&d===descriptions[i-1]).length;
  if(repeated){visual-=Math.min(18,repeated*6);issues.push('repetitive adjacent visuals');}
  const coverage=VISUAL_COVERAGE.filter(k=>list.some(c=>text([c.role,c.editorialRole,c.shotType,c.description,c.reason].join(' ')).includes(k))).length;
  if(list.length>=5&&coverage<4){visual-=10;issues.push('visual coverage lacks cinematic variety');}

  if(!music?.audioAvailable){audio-=35;issues.push('no audible soundtrack');}
  if(music?.generationMode?.includes('fallback')||music?.generationModel?.includes('local-original')){audio-=18;issues.push('local soundtrack is a production sketch, not a final music master');}
  if(music?.finalMaster===false){audio-=15;issues.push('music is not marked as final master');}
  const composition=music?.composition||music?.plan||{};
  const present=MUSIC_QUALITIES.filter(k=>composition?.arrangement?.[k]||composition?.qualities?.[k]||composition?.mix?.[k]||composition?.master?.[k]).length;
  if(music&&present<5){audio-=10;issues.push('music arrangement contract is incomplete');}
  if(music?.sections?.length<4){audio-=8;issues.push('music structure lacks song-level development');}
  if(music?.beatGrid&&!music?.editSync){audio-=5;issues.push('music is not confirmed edit-synchronised');}

  if(Array.isArray(generatedScenes)&&generatedScenes.length){
    const originals=generatedScenes.filter(s=>s?.originality?.originalOnly!==false).length;
    if(originals<generatedScenes.length){generation-=25;issues.push('generated scene originality contract failed');}
    const linked=generatedScenes.filter(s=>s?.subjectContinuity||s?.continuity||s?.subjectIdentity).length;
    if(linked<generatedScenes.length){generation-=12;issues.push('generated scene continuity metadata incomplete');}
  }

  const score=Math.round(clamp(visual*.45+audio*.35+generation*.2,0,100));
  return {score,visual:Math.round(clamp(visual,0,100)),audio:Math.round(clamp(audio,0,100)),generation:Math.round(clamp(generation,0,100)),subject,issues,pass:score>=85&&audio>=80&&visual>=80};
}

export function buildProfessionalMusicRequest({prompt='',duration=30,genre='cinematic',mood='cinematic',energy=.72,bpm=112,filmType='song',composition={}}={}) {
  return {
    version:'professional-original-music-request-v1',
    finalMasterRequired:true,
    duration:Number(duration),genre,mood,energy,bpm,filmType,
    prompt:prompt||'Create an original, commercially usable, professionally produced song for this film.',
    requirements:{
      originalComposition:true,
      songLevelArrangement:true,
      intro:true,verse:true,preChorus:true,chorus:true,bridge:true,finalChorus:true,outro:true,
      memorableOriginalMotif:true,
      motifDevelopment:true,
      rhythmicVariation:true,
      dynamicAutomation:true,
      instrumentalLayers:true,
      stereoMix:true,
      mastering:true,
      loudnessConsistency:true,
      editSync:true,
      stemsPreferred:true,
      instrumentalAndVocalOptions:true,
      noNamedSongImitation:true,
      noReproductionOfExistingMelodies:true,
    },
    composition,
  };
}
