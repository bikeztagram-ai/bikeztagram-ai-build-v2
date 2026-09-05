/* BIKEZTAGRAM AI — Universal Creative Engine v1
   Local-first creative planning primitives. No remote AI/provider dependency.
   Turns free-form briefs into a richer, extensible scene graph that can drive
   procedural 2D/2.5D/3D renderers, real media edits, sound design and future
   local model runtimes without changing the public creative brief format.
*/

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const text=v=>String(v??'').trim();
const lower=v=>text(v).toLowerCase();
const has=(p,...xs)=>xs.some(x=>p.includes(x));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rng=seed=>{let x=(seed>>>0)||1;return()=>{x=Math.imul(x+0x6D2B79F5,1)|0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};

const WORLD_ALIASES={
  voxel:['minecraft','voxel','block world','blocky','pixel world'],
  urban:['gta','grand theft','open world','crime game','urban chase','city chase'],
  cyberpunk:['cyberpunk','neon','synthwave','future city','futuristic city'],
  scifi:['sci-fi','science fiction','space','galaxy','alien','spaceship','planet'],
  fantasy:['fantasy','dragon','wizard','magic','medieval','castle','elf'],
  western:['western','cowboy','wild west','saloon'],
  horror:['horror','zombie','haunted','creepy','monster','vampire'],
  underwater:['underwater','ocean','deep sea','submarine','coral reef'],
  racing:['racing','race track','formula','motorsport','drift','street race'],
  jungle:['jungle','rainforest','tropical'],
  mars:['mars','red planet','martian'],
  apocalypse:['apocalypse','post-apocalyptic','wasteland','ruins'],
  steampunk:['steampunk','brass machinery','victorian machine'],
  anime:['anime','manga','cel shaded'],
  miniature:['miniature','toy world','diorama'],
  abstract:['abstract','surreal','dreamlike','experimental']
};

const CAMERA={
  aerial:['drone','aerial','overhead','top down','bird eye'],
  fpv:['fpv','first person','helmet cam'],
  chase:['chase','follow','pursuit','tracking'],
  orbit:['orbit','360','around the subject','circular camera'],
  macro:['macro','close-up','closeup','detail shot'],
  low:['low angle','ground level','low camera'],
  handheld:['handheld','documentary','shaky cam'],
  static:['static','locked off','tripod'],
  cinematic:['cinematic','trailer','film','commercial','movie']
};

const MOODS={
  dark:['dark','moody','noir','gritty','ominous'],
  epic:['epic','blockbuster','massive','spectacular','monumental'],
  dreamy:['dreamy','ethereal','magical','soft','beautiful'],
  energetic:['fast','aggressive','energetic','viral','punchy','intense'],
  emotional:['emotional','heartfelt','nostalgic','romantic','moving'],
  funny:['funny','comedy','comic','meme','absurd'],
  tense:['tense','suspense','thriller','danger','anxious'],
  peaceful:['calm','peaceful','relaxing','serene','quiet']
};

const WEATHER={rain:['rain','rainy','storm','wet'],snow:['snow','snowing','blizzard'],fog:['fog','mist','hazy'],dust:['dust','dust storm','sandstorm'],ash:['ash','smoke','volcanic'],clear:['clear','sunny','bright']};
const TIMES={night:['night','midnight','dark night'],sunset:['sunset','golden hour','dusk'],dawn:['sunrise','dawn','early morning'],day:['day','daylight','afternoon']};
const SUBJECTS={motorcycle:['motorcycle','motorbike','bike','ninja','z1000','harley','ducati'],car:['car','vehicle','supercar','sports car'],character:['person','rider','hero','character','woman','man','soldier'],creature:['dragon','monster','creature','alien'],aircraft:['plane','jet','helicopter','drone'],ship:['ship','boat','submarine'],product:['product','phone','watch','helmet','shoe']};

function firstMatch(p,map,fallback){for(const [key,words] of Object.entries(map))if(has(p,...words))return key;return fallback;}
function allMatches(p,map){return Object.entries(map).filter(([,words])=>has(p,...words)).map(([key])=>key);}

export function interpretCreativeBrief(prompt='',options={}){
  const p=lower(prompt);
  const worlds=allMatches(p,WORLD_ALIASES);
  const cameras=allMatches(p,CAMERA);
  const moods=allMatches(p,MOODS);
  const weather=firstMatch(p,WEATHER,'clear');
  const time=firstMatch(p,TIMES,'day');
  const subject=firstMatch(p,SUBJECTS,'subject');
  const world=worlds[0]||'cinematic';
  const pace=has(p,'fast','rapid','aggressive','chase','race','action','viral')?'fast':has(p,'slow','calm','dreamy','emotional','beautiful')?'slow':'cinematic';
  const camera=cameras[0]||'cinematic';
  const mood=moods[0]||'cinematic';
  const duration=clamp(Number(options.duration)||Number((p.match(/(\d+(?:\.\d+)?)\s*(?:second|seconds|sec|s)\b/)||[])[1])||15,3,120);
  const intensity=has(p,'extreme','insane','maximum','massive','huge')?1:has(p,'subtle','minimal','gentle')?.35:.72;
  return {version:1,originalPrompt:text(prompt),world,worldAlternatives:worlds,camera,cameraAlternatives:cameras,mood,moodAlternatives:moods,weather,time,subject,pace,duration,intensity,keywords:p.split(/[^a-z0-9-]+/).filter(Boolean).slice(0,80),local:true};
}

function roleFor(i,count,brief){
  if(i===0)return'establish';
  if(i===count-1)return'hero-ending';
  if(brief.pace==='fast')return['approach','action','escalation','payoff'][Math.min(3,i-1)%4];
  if(brief.mood==='emotional'||brief.pace==='slow')return['build','reveal','emotional-beat','hero'][Math.min(3,i-1)%4];
  if(brief.mood==='horror'||brief.mood==='tense')return['mystery','tension','reveal','escape'][Math.min(3,i-1)%4];
  return['build','reveal','action','hero'][Math.min(3,i-1)%4];
}

function cameraFor(i,brief){
  if(brief.camera==='aerial')return['aerial-establish','aerial-push','aerial-orbit','aerial-pull'][i%4];
  if(brief.camera==='fpv')return['fpv-forward','fpv-turn','fpv-dive','fpv-rise'][i%4];
  if(brief.camera==='chase')return['chase-follow','side-track','low-chase','overtake'][i%4];
  if(brief.camera==='orbit')return['orbit-left','orbit-right','half-orbit','hero-orbit'][i%4];
  if(brief.camera==='macro')return['macro-push','macro-pan','macro-rack','macro-pull'][i%4];
  if(brief.camera==='low')return['low-push','low-track','low-orbit','low-pull'][i%4];
  return['slow-push','pan-right','orbit','slow-pull'][i%4];
}

function transitionFor(i,brief){
  if(i===0)return'fade-in';
  if(i===999)return'fade-out';
  if(brief.pace==='fast')return['flash-cut','whip-right','hard-cut','zoom-punch','whip-left'][i%5];
  if(brief.mood==='horror'||brief.mood==='tense')return['dip-black','hard-cut','crossfade','flash-cut'][i%4];
  if(brief.mood==='dreamy'||brief.pace==='slow')return['crossfade','light-leak-right','crossfade','dip-black'][i%4];
  return['crossfade','hard-cut','zoom-punch','light-leak-left'][i%4];
}

function worldPalette(world,mood){
  const base={cinematic:['deep-blue','steel','silver'],voxel:['grass-green','earth','sky-blue'],urban:['midnight','concrete','sodium'],cyberpunk:['violet','electric-blue','magenta'],scifi:['space-black','nebula-blue','ice'],fantasy:['forest','stone','gold'],western:['sand','wood','sun'],horror:['black','charcoal','cold-purple'],underwater:['abyss-blue','teal','aqua'],racing:['asphalt','white','signal-red'],jungle:['deep-green','moss','sun'],mars:['oxide-red','dust','amber'],apocalypse:['ash','rust','smoke'],steampunk:['brass','coal','copper'],anime:['ink','cel-blue','accent'],miniature:['painted','wood','paper'],abstract:['black','gradient','light']}[world]||['deep-blue','steel','silver'];
  if(mood==='dark'||mood==='horror')return [base[0],'black',base[2]];
  return base;
}

export function buildCreativeSceneGraph(prompt='',options={}){
  const brief=interpretCreativeBrief(prompt,options);
  const seed=hash(`${brief.originalPrompt}|${options.seed||0}`);
  const random=rng(seed);
  const count=clamp(Number(options.shots)||Math.ceil(brief.duration/(brief.pace==='fast'?2:3)),3,24);
  const palette=worldPalette(brief.world,brief.mood);
  const shots=Array.from({length:count},(_,i)=>{
    const role=roleFor(i,count,brief);
    const duration=Number((brief.duration/count*(.86+random()*.28)).toFixed(3));
    return {id:`creative-${i+1}`,index:i,role,duration,world:brief.world,subject:brief.subject,camera:cameraFor(i,brief),transition:i===0?'fade-in':i===count-1?'fade-out':transitionFor(i,brief),motionIntensity:Number(clamp(brief.intensity*(.8+random()*.4),.15,1.25).toFixed(2)),weather:brief.weather,time:brief.time,mood:brief.mood,palette,seed:Math.floor(random()*0xffffffff),depthLayers:buildDepthLayers(brief.world,brief.mood),effects:buildEffects(brief),beats:[],prompt:brief.originalPrompt};
  });
  const total=shots.reduce((s,x)=>s+x.duration,0);
  const normalized=shots.map((s,i)=>({...s,duration:Number((s.duration*brief.duration/total).toFixed(3)),beats:buildShotBeats(s,brief)}));
  return {version:2,type:'universal-scene-graph',seed,brief,palette,shots:normalized,totalDuration:Number(normalized.reduce((s,x)=>s+x.duration,0).toFixed(3)),render:{width:1080,height:1920,fps:30,local:true},providers:{video:'local',music:'local'},copyright:{originalAssetsRequired:true,protectedIpReplication:false}};
}

function buildDepthLayers(world,mood){
  const common=['sky','far-background','mid-background','ground','foreground','subject'];
  if(world==='voxel')return [...common,'voxel-terrain','voxel-structures','particles'];
  if(world==='urban'||world==='cyberpunk')return [...common,'far-buildings','mid-buildings','road','vehicles','neon'];
  if(world==='underwater')return [...common,'water-column','coral','particles','caustics'];
  if(world==='space')return [...common,'stars','nebula','planet','particles'];
  if(world==='fantasy')return [...common,'mountains','foliage','fog','magical-particles'];
  return mood==='horror'?[...common,'fog','silhouettes','particles']:common;
}

function buildEffects(brief){
  const fx=[];
  if(brief.weather==='rain')fx.push('rain','wet-reflections','bloom');
  if(brief.weather==='snow')fx.push('snow','cold-haze');
  if(brief.weather==='fog')fx.push('fog','volumetric-haze');
  if(brief.weather==='dust')fx.push('dust','atmospheric-perspective');
  if(brief.mood==='dark')fx.push('vignette','contrast','cool-grade');
  if(brief.mood==='dreamy')fx.push('soft-bloom','diffusion');
  if(brief.mood==='energetic')fx.push('motion-blur','impact-flash');
  if(brief.world==='cyberpunk')fx.push('neon-bloom','chromatic-aberration');
  if(brief.world==='voxel')fx.push('voxel-lighting','pixel-atmosphere');
  return [...new Set(fx)];
}

function buildShotBeats(shot,brief){
  const n=Math.max(2,Math.round(shot.duration*4));
  return Array.from({length:n},(_,i)=>({time:Number((i*shot.duration/(n-1)).toFixed(3)),energy:Number(clamp((i/(n-1))*(brief.pace==='fast'?1:.65)+.2,.1,1).toFixed(2)),action:i===n-1?'cut':'hold'}));
}

export function describeCreativeCapability(prompt=''){const b=interpretCreativeBrief(prompt);return `Local creative brief: ${b.world} world • ${b.subject} subject • ${b.camera} camera • ${b.mood} mood • ${b.weather} • ${b.time} • ${b.pace} pacing • ${b.duration}s • ${Math.round(b.intensity*100)}% intensity.`;}

export function createUniversalCreativeRuntime(options={}){
  const runtime={version:1,localOnly:true,createPlan:(prompt,opts={})=>buildCreativeSceneGraph(prompt,{...options,...opts}),interpret:(prompt,opts={})=>interpretCreativeBrief(prompt,{...options,...opts}),describe:describeCreativeCapability};
  if(typeof window!=='undefined')window.__BIKEZTAGRAM_CREATIVE_RUNTIME__=runtime;
  return runtime;
}
