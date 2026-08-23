/* BIKEZTAGRAM AI — Universal Creative Director v1
   In-house orchestration layer. Converts a natural-language request plus media
   intelligence into a provider-neutral film brief, narrative arc, shot grammar,
   music brief and optional generative-scene slots. It never imitates a named
   copyrighted work or artist and never requires a cloud model to produce a
   useful first-pass direction.
*/

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
const text=v=>String(v??'').trim();
const lower=v=>text(v).toLowerCase();
const has=(s,re)=>re.test(lower(s));

const modes={
  action:/action|chase|pursuit|race|speed|aggressive|adventure|fight|battle|energetic|fast/,
  reveal:/reveal|unveil|launch|showcase|introduction|introduce|hero/,
  trailer:/trailer|teaser|promo|commercial|film|cinematic|movie|epic/,
  suspense:/mystery|mysterious|suspense|tension|thriller|horror|eerie|dark/,
  emotional:/emotional|heartfelt|romantic|nostalgic|beautiful|peaceful|calm/,
  social:/viral|tiktok|reel|shorts|instagram|social|punchy/,
  comedy:/funny|comedy|comic|humorous|meme|chaotic/,
  documentary:/documentary|real story|interview|journalistic|factual/,
  world:/fantasy|sci-fi|science fiction|space|mars|desert|neon|cyber|future|futuristic|alien|underwater/,
};

export function interpretCreativeRequest(prompt=''){
  const p=text(prompt);const detected=Object.entries(modes).filter(([,re])=>re.test(p.toLowerCase())).map(([k])=>k);
  const primary=detected.includes('action')?'action':detected.includes('reveal')?'reveal':detected.includes('suspense')?'suspense':detected.includes('emotional')?'emotional':detected.includes('comedy')?'comedy':detected.includes('documentary')?'documentary':detected.includes('world')?'world':detected.includes('social')?'social':'trailer';
  const visual=has(p,/dark|moody|night|noir|gritty/) ? 'dark-cinematic' : has(p,/bright|sunny|warm|golden/) ? 'warm-cinematic' : has(p,/neon|cyber|future/) ? 'neon-original' : 'cinematic-natural';
  const pace=has(p,/slow|calm|emotional|dreamy/) ? 'slow-burn' : has(p,/fast|rapid|punchy|action|chase|race/) ? 'high-energy' : 'dynamic';
  const camera=has(p,/handheld|raw|documentary/) ? 'observational-handheld' : has(p,/drone|aerial|epic|landscape/) ? 'large-scale-aerial' : 'cinematic-controlled';
  const requestedDuration=(()=>{const m=p.match(/(\d+(?:\.\d+)?)\s*(?:second|seconds|sec|s)\b/i);return m?clamp(Number(m[1]),5,3600):15;})();
  return {version:'creative-director-v1',request:p||'Create the strongest possible original film from the supplied assets.',primaryMode:primary,modes:detected.length?detected:['trailer'],visualLanguage:visual,pace,cameraLanguage:camera,targetDuration:requestedDuration,originality:{required:true,namedStyleImitation:false,namedArtistImitation:false,copyrightSafe:true}};
}

function subjectFromMedia(mediaProfile,analysis){return text(mediaProfile?.primarySubjectType)||text(analysis?.subject?.category)||text(analysis?.subject?.label)||'subject';}
function sourceCount(mediaProfile,items){return Number(mediaProfile?.mediaCount)||Array.isArray(items)?items.length:Number(mediaProfile?.mediaCount)||0;}

export function buildNarrativeArc(directive,{mediaCount=0,hasGeneratedMedia=false}={}){
  const m=directive?.primaryMode||'trailer';
  const base=m==='action'?['hook','anticipation','acceleration','action','hero','outro']:
    m==='reveal'?['mystery','setup','anticipation','reveal','hero','outro']:
    m==='suspense'?['mystery','clues','tension','turn','payoff','lingering-outro']:
    m==='emotional'?['establish','connection','build','emotional-peak','resolution','outro']:
    m==='comedy'?['setup','escalation','misdirection','payoff','reaction','button']:
    m==='documentary'?['context','observation','evidence','human-beat','insight','resolution']:
    ['hook','build','development','impact','hero','outro'];
  return base.map((purpose,index)=>({index,purpose,preferredSource:index<mediaCount?'uploaded':(hasGeneratedMedia?'generated':'uploaded'),intensity:clamp((index/(base.length-1||1))*.45+.5+(purpose==='impact'||purpose==='payoff'||purpose==='reveal'?.2:0),.25,1),requiresVariation:index>0}));
}

export function buildShotGrammar(directive){
  const mode=directive?.primaryMode||'trailer';
  const fast=directive?.pace==='high-energy';
  const dark=directive?.visualLanguage==='dark-cinematic';
  return {
    opening:mode==='reveal'?'slow-push-detail':'immediate-establishing-hook',
    build:fast?'tracking-pan-or-speed-ramp':'controlled-push-or-parallax',
    impact:mode==='comedy'?'whip-cut-reaction':dark?'hard-cut-or-dip-black':'flash-cut-or-motion-match',
    hero:mode==='emotional'?'slow-pull-breathing-space':'hero-push-with-depth',
    transitions:fast?['hard-cut','whip-right','flash-cut','motion-match']:dark?['hard-cut','dip-black','crossfade']:['hard-cut','crossfade','match-motion'],
    avoid:['repetitive zooms','identical transitions','random shot order','copyrighted music','named-style imitation'],
  };
}

export function buildMusicDirectorBrief(directive){
  const mode=directive?.primaryMode||'trailer';
  const genre=mode==='action'?'cinematic-electronic':mode==='suspense'?'dark-score':mode==='emotional'?'cinematic-ambient':mode==='documentary'?'organic-documentary-score':mode==='comedy'?'playful-cinematic':'cinematic-trailer';
  const energy=mode==='suspense'?.64:mode==='emotional'?.52:mode==='comedy'?.78:mode==='action'?.9:.74;
  return {version:'music-director-brief-v1',genre,mood:directive?.visualLanguage||'cinematic',energy,bpm:mode==='emotional'?88:mode==='suspense'?96:mode==='action'?124:112,structure:mode==='action'?'trailer':mode==='documentary'?'score':'short',motif:{original:true,development:true,variationEveryBars:8},soundDesign:['impact accents','riser transitions','low-frequency tension','air/texture bed'],copyright:{originalOnly:true,noNamedSongImitation:true}};
}

export function buildGenerativeSceneSlots(directive,narrative,{mediaCount=0,allowGenerated=true}={}){
  if(!allowGenerated)return [];
  const needs=narrative.filter((beat)=>beat.preferredSource==='generated');
  if(!needs.length)return [];
  const world=directive?.primaryMode==='world'||directive?.modes?.includes('world');
  return needs.map((beat)=>({id:`generated-${beat.index+1}`,purpose:beat.purpose,sourceType:'generated',generationMode:world?'procedural-world':'original-atmosphere',prompt:`Create an original ${world?'cinematic world':'cinematic atmosphere'} shot for the ${beat.purpose} beat. Preserve the user's subject and intent, but do not imitate any named film, game, artist or franchise.`,duration:clamp(directive.targetDuration/Math.max(6,narrative.length),1,5),mediaIndex:Math.min(Math.max(0,mediaCount-1),0),copyrightSafe:true}));
}

export function createCreativeDirectorBrief({prompt='',mediaItems=[],mediaProfile=null,analysis=null,allowGeneratedScenes=true}={}){
  const directive=interpretCreativeRequest(prompt);const count=sourceCount(mediaProfile,mediaItems);const subject=subjectFromMedia(mediaProfile,analysis);const generated=count===0||directive.primaryMode==='world';
  const narrative=buildNarrativeArc(directive,{mediaCount:count,hasGeneratedMedia:allowGeneratedScenes&&generated});
  const slots=buildGenerativeSceneSlots(directive,narrative,{mediaCount:count,allowGenerated:allowGeneratedScenes});
  return {version:'creative-director-v1',title:`${subject} — ${directive.primaryMode} film`,subject,request:directive,narrative,shotGrammar:buildShotGrammar(directive),musicDirector:buildMusicDirectorBrief(directive),generatedSceneSlots:slots,sourceStrategy:{uploadedAssetsFirst:true,generatedSupplementation:slots.length>0,avoidDuplicateShots:true},productionRules:{authenticFootagePriority:true,storyFirst:true,variationRequired:true,originalMusicRequired:true,copyrightSafeGeneration:true}};
}

export function mergeCreativeDirectionIntoPlan(plan,brief){
  if(!plan)return plan;
  const cuts=Array.isArray(plan.cuts)?plan.cuts.map((cut,index)=>({...cut,purpose:cut.purpose||brief?.narrative?.[index]?.purpose||'cinematic-beat',sourceType:cut.sourceType||'uploaded',generationPrompt:cut.generationPrompt||brief?.generatedSceneSlots?.[index]?.prompt||'',directorBeat:index<brief.narrative.length?brief.narrative[index]:null})):[];
  return {...plan,creativeDirector:brief,storyArc:brief.narrative.map(x=>x.purpose),cuts};
}
