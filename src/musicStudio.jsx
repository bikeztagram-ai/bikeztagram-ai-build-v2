import React,{useEffect,useRef,useState} from 'react';
import {createSongProject,renderStemWav,exportSongProject,validateSongProject} from './musicProjectRuntime.js';
import {renderMusicWav,analyseMusicComposition} from './musicStudioEngineCompatibility.js';
import {generateAIMusic} from './aiMusicProvider.js';
import {mergeAudioBlobs} from './musicMixEngine.js';
import './musicStudio.css';

const LIB_KEY='bikeztagram.music.library.v1';
const LIB_DB='bikeztagram.music.library.blobs.v1';

function readLibrary(){try{return JSON.parse(localStorage.getItem(LIB_KEY)||'[]')}catch{return[]}}
function openLibraryDb(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){resolve(null);return}
  const request=window.indexedDB.open(LIB_DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('tracks'))request.result.createObjectStore('tracks',{keyPath:'id'})};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Music library storage unavailable.'));
 });
}
async function storeTrackBlob(id,blob){
 if(!id||!(blob instanceof Blob))return;
 try{
  const db=await openLibraryDb(); if(!db)return;
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('tracks','readwrite'); tx.objectStore('tracks').put({id,blob});
   tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error||new Error('Could not save audio.'));
  });
  db.close();
 }catch{}
}
async function deleteTrackBlob(id){
 if(!id)return;
 try{const db=await openLibraryDb();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}catch{}
}
async function readTrackBlob(id){
 if(!id)return null;
 try{
  const db=await openLibraryDb(); if(!db)return null;
  const value=await new Promise((resolve,reject)=>{
   const tx=db.transaction('tracks','readonly'); const request=tx.objectStore('tracks').get(id);
   request.onsuccess=()=>resolve(request.result?.blob||null); request.onerror=()=>reject(request.error);
  });
  db.close(); return value;
 }catch{return null}
}
function emitTrack(track){window.dispatchEvent(new CustomEvent('bikeztagram:music-selected',{detail:track}))}
function buildMusicIntent(text){
 const value=String(text||'').replace(/\s+/g,' ').trim();
 const crossSource=/\b(vocals?|voice)\s+(from|of)\b/i.test(value)&&/\b(music|instrumental|backing|track)\s+(from|of)\b/i.test(value);
 const genreChange=/\b(country|rock|metal|punk|pop|jazz|blues|rap|trance|house|techno|reggae|folk|classical|soul|funk|disco|edm|acoustic|indie|grunge|gospel)\b/i.test(value);
 return {mode:crossSource?'cross_source':genreChange?'style_transform':'identity_preserve',preserveSourceIdentity:true};
}


function expandLyricsForFullSong(baseLyrics,prompt){
 const base=String(baseLyrics||'').trim();
 if(!base)return base;
 const text=String(prompt||'').toLowerCase();
 if(/dog\s+bowie|my dog\s+bowie/.test(text)||(/fart/.test(text)&&/king of the house/.test(text))){
  return base+'\n\n[Bridge]\nThe sofa is his kingdom, the floor is his domain\nOne royal little trumpet and we all know his name\nWe open every window, but the king will have his way\nBowie rules the house again and again every day\n\n[Final Chorus]\nOh Bowie, king of the house\nFarting loud like a trumpet blast\nOh Bowie, king of the house\nEverybody knows that you are the boss\nWe live with the smell, we live with the sound\nLong live Bowie, the king of the house\nLong live Bowie, the king of the house';
 }
 return base+'\n\n[Bridge]\nBring the story back, let the music rise\nBuild it bigger now beneath the open skies\n\n[Final Chorus]\n'+base.split('\n').filter(line=>line.trim()).slice(-6).join('\n');
}
function buildFallbackVocalLyrics(prompt){
 const text=String(prompt||'').replace(/\s+/g,' ').trim();
 const dog=text.match(/my dog\s+([A-Za-z][A-Za-z0-9'-]*)/i)?.[1] || text.match(/dog\s+([A-Za-z][A-Za-z0-9'-]*)/i)?.[1];
 if(dog && /fart|king of the house|king of this house/i.test(text)){
  return `[Verse 1]
${dog} walks in like he owns the place
Head held high with a royal face
Every room is his, every chair is his throne
He rules the house like it's all his own

[Chorus]
Oh ${dog}, king of the house
Farting loud like a trumpet blast
Oh ${dog}, king of the house
Everybody knows that you're the boss
We live with the smell, we live with the sound
Long live ${dog}, the king of the house

[Verse 2]
He lets one rip and he doesn't care
Then looks around like he wasn't there
We open the windows, we wave the air
But ${dog} just grins like a millionaire

[Chorus]
Oh ${dog}, king of the house
Farting loud like a trumpet blast
Oh ${dog}, king of the house
Everybody knows that you're the boss`;
 }
 const story=text
   .replace(/make (the )?lyrics[^.]*\.?/ig,'')
   .replace(/with a memorable funny chorus\.?/ig,'')
   .trim();
 return `[Verse 1]
${story}

[Chorus]
This is our story, sing it loud
${story}
This is our story, sing it loud

[Verse 2]
${story}

[Chorus]
This is our story, sing it loud
${story}`;
}

function buildAutoCoverLyrics(prompt){
 const text=String(prompt||'').toLowerCase();
 const country=/country|western|twang|honky|slide guitar/.test(text);
 const dark=/dark|gritty|heavy|hard/.test(text);
 const theme=country?['Dust on the highway, headlights cutting through the night','Steel strings ringing while the old road comes alive','Boots on the floor and a fire in the air','We keep rolling till there is nowhere else to go']:dark?['Night is falling and the city starts to shake','Every heartbeat pulls me deeper in the sound','I can feel the fire rising through the dark','Turn it up and let the whole world hear it now']:['We came alive when the first light hit the road','Every heartbeat found a rhythm of its own','Keep the moment moving, never let it fade','We are here tonight and we are not alone'];
 return `[Verse 1]\n${theme[0]}\n${theme[1]}\n\n[Chorus]\n${theme[2]}\n${theme[3]}\n${theme[2]}\n\n[Verse 2]\n${theme[1]}\n${theme[0]}\n${theme[3]}\n${theme[2]}`;
}

function readAudioDuration(file){
 return new Promise(resolve=>{if(!file){resolve(null);return}const url=URL.createObjectURL(file),audio=new Audio();audio.preload='metadata';audio.onloadedmetadata=()=>{const d=Number(audio.duration);URL.revokeObjectURL(url);resolve(Number.isFinite(d)?d:null)};audio.onerror=()=>{URL.revokeObjectURL(url);resolve(null)};audio.src=url});
}

function extractSourceQuery(text){
 const value=String(text||'').replace(/\s+/g,' ').trim();
 if(!value)return '';
 const beforeTransform=value.match(/^(.+?)(?:\s*[—–]\s*|\s+(?:turn|turning|make|making|transform|transforming|remix|remixing|rework|reworking|convert|converting)\b)/i)?.[1];
 if(beforeTransform?.trim().length>=3)return beforeTransform.trim();
 const into=value.match(/^(.+?)\s+(?:into|as)\s+/i)?.[1];
 if(into?.trim().length>=3)return into.trim().replace(/^(?:take|use)\s+/i,'');
 return value;
}

export default function MusicStudio(){
 const [open,setOpen]=useState(false),[advancedOpen,setAdvancedOpen]=useState(false),[intent,setIntent]=useState('create'),[prompt,setPrompt]=useState(''),[projectName,setProjectName]=useState(''),[duration,setDuration]=useState(30),[sourceDuration,setSourceDuration]=useState(null),[bpm,setBpm]=useState('auto'),[key,setKey]=useState('auto'),[mode,setMode]=useState('auto'),[lyrics,setLyrics]=useState(''),[instrumental,setInstrumental]=useState(false),[vocalLanguage,setVocalLanguage]=useState('en'),[vocalDirection,setVocalDirection]=useState(''),[sourceAudio,setSourceAudio]=useState(null),[sourcePreviewUrl,setSourcePreviewUrl]=useState(''),[referenceAudio,setReferenceAudio]=useState(null),[mixAudio,setMixAudio]=useState(null),[mixMode,setMixMode]=useState('layer'),[sourceMatch,setSourceMatch]=useState(null),[songDna,setSongDna]=useState(null),[editingVersionId,setEditingVersionId]=useState(null),[editingVersion,setEditingVersion]=useState(1),[sourceSearching,setSourceSearching]=useState(false),[coverStrength,setCoverStrength]=useState(.55),[huggingFaceToken,setHuggingFaceToken]=useState(()=>{try{return localStorage.getItem('bikeztagram.huggingface.token')||''}catch{return''}}),[project,setProject]=useState(null),[audioUrl,setAudioUrl]=useState(''),[audioMime,setAudioMime]=useState('audio/wav'),[provider,setProvider]=useState(''),[songId,setSongId]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[playing,setPlaying]=useState(false),[library,setLibrary]=useState(readLibrary),[speechSupported,setSpeechSupported]=useState(false),[isPromptListening,setIsPromptListening]=useState(false),audioRef=useRef(null),playerRef=useRef(null),speechRef=useRef(null);
 useEffect(()=>{
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  setSpeechSupported(Boolean(SpeechRecognition));
  return ()=>{try{speechRef.current?.stop?.()}catch{}}
 },[]);
 const togglePromptVoice=()=>{
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){setStatus('VOICE INPUT IS NOT AVAILABLE in this browser. Try Chrome on Android.');return;}
  if(isPromptListening){try{speechRef.current?.stop?.()}catch{};setIsPromptListening(false);return;}
  const recognition=new SpeechRecognition();
  recognition.lang='en-GB'; recognition.continuous=true; recognition.interimResults=true;
  let finalText=String(prompt||'').trim();
  recognition.onstart=()=>{setIsPromptListening(true);setStatus('🎙 LISTENING — describe exactly what you want the song to do.');};
  recognition.onresult=event=>{
   let interim='';
   for(let i=event.resultIndex;i<event.results.length;i++){
    const text=event.results[i][0]?.transcript||'';
    if(event.results[i].isFinal){finalText=(finalText?finalText+' ':'')+text.trim();} else interim+=(interim?' ':'')+text.trim();
   }
   setPrompt((finalText+(interim?' '+interim:'')).trim());
  };
  recognition.onerror=event=>{setIsPromptListening(false);if(event.error!=='aborted')setStatus(event.error==='not-allowed'?'VOICE INPUT BLOCKED — allow microphone access for this site.':'VOICE INPUT ERROR — '+event.error+'.');};
  recognition.onend=()=>{setIsPromptListening(false);speechRef.current=null;if(finalText)setStatus('✓ VOICE PROMPT CAPTURED — edit it if you like, then create the song.');};
  speechRef.current=recognition;
  try{recognition.start();}catch(error){setIsPromptListening(false);speechRef.current=null;setStatus(error?.message||'Could not start voice input.');}
 };
useEffect(()=>{const openMusic=()=>setOpen(true);window.addEventListener('bikeztagram:open-music',openMusic);try{const params=new URLSearchParams(window.location.search);const requested=params.get('music')==='1'||params.get('studio')==='music'||window.location.hash==='#music';if(requested)setOpen(true)}catch{}return()=>window.removeEventListener('bikeztagram:open-music',openMusic)},[]);
 useEffect(()=>{if(!open){document.body.style.overflow='';return}document.body.style.overflow='hidden';return()=>{document.body.style.overflow=''}},[open]);
 useEffect(()=>{
  let active=true;
  (async()=>{
   const meta=readLibrary();
   const hydrated=await Promise.all(meta.map(async item=>({...item,blob:await readTrackBlob(item.id)})));
   if(active)setLibrary(hydrated);
  })();
  return()=>{active=false};
 },[]);
 useEffect(()=>{if(intent!=='remix'||busy)return;const query=extractSourceQuery(prompt);if(query.length<3){setSourceMatch(null);setSongDna(null);setSourceSearching(false);return}const timer=setTimeout(async()=>{setSourceSearching(true);try{const r=await fetch('/api/song-intelligence?q='+encodeURIComponent(query)+'&transform='+encodeURIComponent(prompt));const data=await r.json();const match=data?.matches?.[0]||null;setSourceMatch(match);setSongDna(match?.songDna||null)}catch{setSourceMatch(null);setSongDna(null)}finally{setSourceSearching(false)}},400);return()=>clearTimeout(timer)},[intent,prompt,busy]);
 useEffect(()=>()=>{if(audioUrl)URL.revokeObjectURL(audioUrl);if(sourcePreviewUrl)URL.revokeObjectURL(sourcePreviewUrl);audioRef.current?.pause?.()},[audioUrl,sourcePreviewUrl]);
 const beginNewVersion=async(item)=>{
  if(!item)return;
  const storedBlob=item.blob instanceof Blob?item.blob:await readTrackBlob(item.id);
  if(!storedBlob){setStatus('This track has no local audio available for editing. Generate or open the track again first.');return;}
  if(sourcePreviewUrl)URL.revokeObjectURL(sourcePreviewUrl);
  setSourceAudio(storedBlob);
  setSourcePreviewUrl(URL.createObjectURL(storedBlob));
  setSourceDuration(Number(item.duration)||null);
  setReferenceAudio(null);
  setSourceMatch(null);
  setIntent('remix');
  setAdvancedOpen(true);
  setPrompt(item.prompt||'');
  setLyrics('');
  setInstrumental(false);
  setVocalDirection('');
  setEditingVersionId(item.id);
  setEditingVersion(Number(item.version)||1);
  setStatus(`✓ EDITING VERSION ${Number(item.version)||1} — change the brief below and create the next version. The original stays in your library.`);
  requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
};
const persistLibraryMeta=next=>{
  try{localStorage.setItem(LIB_KEY,JSON.stringify(next.map(({blob,url,...meta})=>meta)))}catch{}
};
const renameTrack=(item,title)=>{
  const nextTitle=String(title||'').trim();
  const next=library.map(x=>x.id===item.id?{...x,title:nextTitle||'AI Song'}:x);
  setLibrary(next);
  persistLibraryMeta(next);
};
const deleteTrack=async item=>{
  if(!item)return;
  const removeIds=new Set([item.id]);
  let changed=true;
  while(changed){
    changed=false;
    for(const candidate of library){
      if(candidate.parentId&&removeIds.has(candidate.parentId)&&!removeIds.has(candidate.id)){
        removeIds.add(candidate.id);
        changed=true;
      }
    }
  }
  const count=removeIds.size;
  const confirmed=window.confirm(
    count>1
      ? `Delete "${item.title||'AI Song'}" and its ${count-1} saved version${count===2?'':'s'}? This cannot be undone.`
      : `Delete "${item.title||'AI Song'}"? This cannot be undone.`
  );
  if(!confirmed)return;
  const next=library.filter(x=>!removeIds.has(x.id));
  setLibrary(next);
  persistLibraryMeta(next);
  await Promise.all([...removeIds].map(id=>deleteTrackBlob(id)));
  if(removeIds.has(songId)){
    if(audioRef.current)audioRef.current.pause();
    if(audioUrl)URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setAudioMime('audio/wav');
    setSongId('');
    setPlaying(false);
  }
  setStatus(`✓ DELETED "${item.title||'AI Song'}"${count>1?' AND ITS SAVED VERSIONS':''}.`);
};
const saveLibrary=async(item)=>{
  const next=[item,...library.filter(x=>x.id!==item.id)].slice(0,12);
  setLibrary(next);
  try{localStorage.setItem(LIB_KEY,JSON.stringify(next.map(({blob,url,...meta})=>meta)))}catch{}
  await storeTrackBlob(item.id,item.blob);
 };
 const handleSourceFile=async(file)=>{if(sourcePreviewUrl)URL.revokeObjectURL(sourcePreviewUrl);setSourceAudio(file);setSourcePreviewUrl(file?URL.createObjectURL(file):'');const d=await readAudioDuration(file);setSourceDuration(d?Math.min(600,Math.max(10,d)):null)};
 const createTestSource=async()=>{
  setBusy(true);setStatus('Creating a short original test source with ACE-Step…');
  try{
   const ai=await generateAIMusic({prompt:'Create a short original rock song for a transformation test: punchy live drums, electric guitar riff, bass, clear sung lead vocal, strong verse and chorus, no reference to any existing song.',durationMs:15000,forceInstrumental:false,vocalLanguage:'en',lyrics:buildAutoCoverLyrics('rock'),vocalDirection:'confident gritty lead singer, clearly sung from the opening seconds',taskType:'text2music'});
   const file=new File([ai.blob],'bikeztagram-test-source.mp3',{type:ai.mimeType||'audio/mpeg'});
   const d=await readAudioDuration(file);
   if(sourcePreviewUrl)URL.revokeObjectURL(sourcePreviewUrl);setSourceAudio(file);setSourcePreviewUrl(URL.createObjectURL(file));setSourceDuration(d?Math.min(600,Math.max(10,d)):10);setReferenceAudio(null);setSourceMatch(null);setSongDna(null);setIntent('remix');
   setPrompt('Transform this test source into a deep country version. Preserve its recognisable musical movement and song structure, but use twangy guitars, slide guitar, live country drums, bass and a proper lead vocal. Keep the source identity rather than making generic country music.');
   setInstrumental(false);setLyrics('');setVocalDirection('gritty country lead singer');setProvider(ai.provider);setSongId(ai.songId||'');setStatus('✓ TEST SOURCE READY — now press TRANSFORM SOURCE to test the real source-audio pipeline.');
  }catch(error){setStatus(error?.message||'Could not create the test source.')}
  finally{setBusy(false)}
 };
 const mergeSources=async()=>{
  if(!sourceAudio||!mixAudio){setStatus('MASHUP NEEDS TWO AUDIO SOURCES — add Source A and Source B first.');return;}
  setBusy(true);setStatus(mixMode==='crossfade'?'CROSSFADE MIX — rendering both tracks locally…':'MASHUP MIX — layering both tracks locally…');
  try{
   const mixed=await mergeAudioBlobs(sourceAudio,mixAudio,{mode:mixMode,gainA:.78,gainB:.72,crossfade:4});
   if(audioUrl)URL.revokeObjectURL(audioUrl);
   const url=URL.createObjectURL(mixed.blob);
   setAudioUrl(url);setAudioMime(mixed.mimeType);setProvider('Browser-local Mashup Engine');setSongId(crypto.randomUUID());
   const title=(projectName||'AI Song').trim()+' · MASHUP';
   const item={id:crypto.randomUUID(),title,prompt:'Local mashup / '+mixMode,duration:mixed.duration,provider:'Browser-local Mashup Engine',createdAt:new Date().toISOString(),mimeType:mixed.mimeType,blob:mixed.blob,url,version:1};
   await saveLibrary(item);
   setLibrary(prev=>[item,...prev.filter(x=>x.id!==item.id)].slice(0,12));
   setStatus('✓ MASHUP READY — both tracks were mixed on this device. No audio was uploaded.');
  }catch(error){setStatus(error?.message||'Could not mix the two audio sources.')}
  finally{setBusy(false)}
 };
 const saveHuggingFaceToken=value=>{const next=String(value||'').trim();setHuggingFaceToken(next);try{if(next)localStorage.setItem('bikeztagram.huggingface.token',next);else localStorage.removeItem('bikeztagram.huggingface.token')}catch{}};
 const make=async({full=false}={})=>{
  const remixing=intent==='remix';
  const musicIntent=buildMusicIntent(prompt);
  if(remixing&&!sourceAudio&&!sourceMatch){setStatus('SOURCE SONG NOT FOUND YET — name the artist and song clearly so Bikeztagram can build the reconstruction plan.');return;}
  // A new generation must never leave the previous track looking like the result of the new request.
  if(audioRef.current)audioRef.current.pause();
  if(audioUrl)URL.revokeObjectURL(audioUrl);
  setAudioUrl('');
  setAudioMime('audio/wav');
  setSongId('');
  setProvider('');
  setPlaying(false);
  setBusy(true);setStatus(full?'Building a full-song reconstruction (up to 180 seconds)…':remixing?(sourceAudio?'Transforming the authorised source audio…':'Building Song DNA and reconstructing the identified song as a new production…'):'Generating a real original song with MiniMax Music 3…');
  try{
   const seconds=full?180:remixing&&sourceDuration?Math.min(600,Math.max(10,sourceDuration)):Number(duration);
   const effectiveLyrics=!instrumental?(lyrics.trim()?(full?expandLyricsForFullSong(lyrics,prompt):lyrics):(remixing?buildAutoCoverLyrics(prompt):expandLyricsForFullSong(buildFallbackVocalLyrics(prompt),prompt))):'';
   const dna=sourceMatch?.songDna||songDna;
   const dnaBrief=dna?[
     'SOURCE IDENTITY: '+dna.artist+' — '+dna.title+'.',
     'SONG DNA: '+dna.genre+'; era '+dna.era+'; '+dna.energy+' energy; '+dna.rhythm+'; '+dna.instrumentation+'; '+dna.vocalCharacter+'.',
     'STRUCTURE GUIDE: '+dna.structure+'.',
     dna.knownFacts?'KNOWN FACTS: '+dna.knownFacts+'.':'',
     'DNA CONFIDENCE: '+dna.confidence+'. Treat inferred musical traits as production guidance, not direct audio analysis.'
   ].filter(Boolean).join(' '):'';
   const brief=remixing
     ? [prompt,
        musicIntent.mode==='cross_source'?'Treat this as a deliberate cross-source reconstruction: keep the requested vocal identity/source separate from the requested musical/instrumental identity/source, then rebuild both roles.':
        'Reconstruct the identified catalogue song as a new production. Preserve the requested source identity and structural intent where possible, but do not use or download the catalogue recording.',
        dnaBrief,
        'Apply the requested transformation deliberately: change genre, tempo, instrumentation, vocal character and mix as requested. Do not collapse into generic genre music.',
        'If no authorised source audio or user-supplied lyrics are present, generate a fresh lyrical/melodic interpretation rather than claiming to reproduce the original master or exact lyrics.'
       ].filter(Boolean).join(' ')
     : full?prompt+'. Develop this musical idea into a complete song with a clear intro, evolving sections, a strong chorus/drop and a satisfying ending.':prompt;
   const vocalBrief=!instrumental ? (vocalDirection ? ` IMPORTANT LYRIC BRIEF: make the sung lyrics directly about the user's exact subject and concrete details in this request. Name the requested people, animals, places, objects, actions and funny/story details. Build verses and a memorable chorus from the user's story. Do not replace the story with generic genre lyrics. Sung vocal direction: ${vocalDirection}.` : ` IMPORTANT LYRIC BRIEF: make the sung lyrics directly about the user's exact subject and concrete details in this request. Name the requested people, animals, places, objects, actions and funny/story details. Build verses and a memorable chorus from the user's story. Do not replace the story with generic genre lyrics. Use a natural melodic lead vocal, clearly sung rather than spoken.`) : '';
   const ai=await generateAIMusic({prompt:brief+vocalBrief,durationMs:seconds*1000,forceInstrumental:instrumental,bpm:bpm==='auto'?undefined:Number(bpm),key:key==='auto'?undefined:key,mode:mode==='auto'?undefined:mode,lyrics:effectiveLyrics,vocalLanguage,vocalDirection,sourceAudio:remixing?sourceAudio:null,referenceAudio:remixing?referenceAudio:null,taskType:remixing&&sourceAudio?'cover':'text2music',coverStrength,huggingFaceToken});
   if(audioUrl)URL.revokeObjectURL(audioUrl);
   const url=URL.createObjectURL(ai.blob);setAudioUrl(url);setAudioMime(ai.mimeType);setProvider(ai.provider);setSongId(ai.songId||'');
   const previousVersion=editingVersionId?Number(editingVersion)||1:0;
   const cleanProjectName=String(projectName||'').trim();
   const baseTitle=cleanProjectName||(library.find(x=>x.id===editingVersionId)?.title||'AI Song').replace(/ · V\d+$/,'');
   const item={id:ai.songId||crypto.randomUUID(),title:previousVersion?`${baseTitle} · V${previousVersion+1}`:full?(baseTitle||'Full Song Draft'):(baseTitle||'AI Song'),prompt:brief,duration:seconds,provider:ai.provider,createdAt:new Date().toISOString(),mimeType:ai.mimeType,blob:ai.blob,url,parentId:editingVersionId||null,version:previousVersion+1};
   setLibrary(prev=>[item,...prev.filter(x=>x.id!==item.id)].slice(0,12));setProjectName(baseTitle);setEditingVersionId(null);setEditingVersion(item.version||1);setProvider(ai.provider);setStatus(full?'FULL SONG DRAFT READY — up to 180 seconds requested.':remixing?'SOURCE TRANSFORM READY — real transformed audio':'AI MUSIC READY — real generated audio');emitTrack(item);
   const p=createSongProject({prompt:brief,duration:seconds,bpm,key,mode});if(validateSongProject(p).ok)setProject(p);
   saveLibrary(item);
  }catch(error){
   const message=String(error?.message||'Music generation failed.');
   setStatus(message.length>900?message.slice(0,900)+'…':message);
  }
  finally{setBusy(false)}
 };
 const preview=()=>{if(!audioUrl)return;audioRef.current?.pause?.();const a=new Audio(audioUrl);a.onended=()=>setPlaying(false);audioRef.current=a;a.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false))};
 const download=()=>{if(!audioUrl)return;const a=document.createElement('a');a.href=audioUrl;a.download='bikeztagram-ai-song.'+(audioMime.includes('mpeg')?'mp3':'wav');a.click()};
 const useInVideo=()=>{const item=library.find(x=>x.url===audioUrl)||{id:songId||crypto.randomUUID(),title:'Bikeztagram soundtrack',prompt,duration,provider,mimeType:audioMime,createdAt:new Date().toISOString(),url:audioUrl};emitTrack(item);setStatus('✓ Selected track is ready to use in Video Creator.');setOpen(false);window.dispatchEvent(new CustomEvent('bikeztagram:open-creator'))};
 const downloadProject=()=>{if(!project)return;const blob=new Blob([exportSongProject(project)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bikeztagram-song-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const downloadStem=stem=>{if(!project)return;const{blob}=renderStemWav(project,stem),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bikeztagram-'+stem+'.wav';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const localDraft=()=>{if(!project)return;const blob=renderMusicWav(project.composition);if(audioUrl)URL.revokeObjectURL(audioUrl);setAudioMime('audio/wav');setAudioUrl(URL.createObjectURL(blob));setProvider('Local draft');setStatus('LOCAL DRAFT — useful for arrangement, not the AI song')};
 const stats=project?analyseMusicComposition(project.composition):null;
 const loadSaved=async(item,{autoplay=false}={})=>{
  if(!item)return;
  const storedBlob=item.blob instanceof Blob?item.blob:await readTrackBlob(item.id);
  const nextUrl=storedBlob?URL.createObjectURL(storedBlob):item.url;
  if(!nextUrl){setStatus('This saved track has no playable audio. Generate it again to restore the audio.');return;}
  setPlaying(false);
  setAudioUrl(nextUrl);
  setAudioMime(item.mimeType||storedBlob?.type||'audio/wav');
  setProvider(item.provider||'ACE-Step 1.5');
  setSongId(item.id||'');
  setPrompt(item.prompt||'');
  setProjectName(String(item.title||'').replace(/ · V\d+$/,''));
  setDuration(Number(item.duration)||30);
  setStatus(storedBlob?'✓ FULL TRACK LOADED — ready to play.':'✓ TRACK LOADED — press PLAY to listen.');
  requestAnimationFrame(()=>{
   playerRef.current?.scrollIntoView?.({behavior:'smooth',block:'center'});
   if(autoplay){
    const el=playerRef.current?.querySelector('audio');
    if(el){
     el.play().then(()=>setPlaying(true)).catch(()=>setStatus('✓ TRACK LOADED — press PLAY in the player to listen.'));
    }
   }
  });
 };

 return <>{!open&&<button className="music-studio-launch" onClick={()=>setOpen(true)} aria-expanded={open}>♫ MUSIC</button>}
 {open&&<main className="music-studio-page" aria-label="Standalone Music Studio">
  <div className="music-studio-head"><button className="music-back" onClick={()=>setOpen(false)} aria-label="Back to main screen">‹ <span>BACK</span></button><div className="music-studio-title"><span>BIKEZTAGRAM AI • MUSIC STUDIO</span><h3>Make your own music.</h3></div><div className="music-head-spacer" aria-hidden="true"/></div>

  <section className="music-create-hub">
   <div className="music-create-eyebrow">AI MUSIC DIRECTOR</div>
   <h1>What do you want to make?</h1>
   <p>Describe the song in your own words. Bikeztagram will work out the music, lyrics, vocals and arrangement for you.</p>
   <label className="music-project-name"><span>PROJECT NAME <small>optional — saved songs are easier to find</small></span><input value={projectName} onChange={e=>setProjectName(e.target.value)} disabled={busy} maxLength={80} placeholder="e.g. Bowie's House Rules"/></label><div className="music-prompt-wrap"><textarea className="music-prompt-hub" value={prompt} onChange={e=>setPrompt(e.target.value)} disabled={busy} aria-label="Describe the song you want" placeholder="Tell Bikeztagram exactly what you want the song to do…"/><button type="button" className={"music-prompt-mic"+(isPromptListening?" listening":"")} onClick={togglePromptVoice} disabled={busy} aria-label={isPromptListening?"Stop voice input":"Speak your music prompt"} title={speechSupported?"Speak your music prompt":"Voice input needs a browser with Web Speech support"}>{isPromptListening?'■':'🎙'}</button></div>
   <div className="music-prompt-hints"><button type="button" onClick={()=>setPrompt('Make a funny upbeat rock song about my dog Bowie who farts all the time and thinks he is the king of the house.')}>🐶 Try an idea</button><button type="button" onClick={()=>setPrompt('Make an emotional cinematic song about riding my motorcycle through the Lake District at sunset.')}>🏍️ Try another</button></div>
   <button className="primary-cta music-create-main" onClick={()=>make()} disabled={busy||(intent==='remix'&&!sourceMatch)}>{busy?'◌ CREATING YOUR SONG…':'✦ CREATE SONG'}</button>
   <button className="music-advanced-toggle" type="button" onClick={()=>setAdvancedOpen(v=>!v)} aria-expanded={advancedOpen}>{advancedOpen?'⌃ HIDE ADVANCED OPTIONS':'⚙ ADVANCED OPTIONS'}<span>{advancedOpen?'Use the simple creator':'Remix, manual lyrics, vocals and technical controls'}</span></button>
  </section>

  {advancedOpen&&<section className="music-advanced-panel">
   <div className="music-intent-tabs"><button className={intent==='create'?'active':''} onClick={()=>setIntent('create')} disabled={busy}>✦ CREATE</button><button className={intent==='remix'?'active':''} onClick={()=>setIntent('remix')} disabled={busy}>↻ REMIX / TRANSFORM</button></div>
   <p className="music-advanced-note">Most people never need these controls. There are two different remix paths: <strong>RECONSTRUCT</strong> uses Song Intelligence plus a new AI generation without downloading catalogue audio; <strong>TRANSFORM SOURCE</strong> uses an authorised audio file and a true audio-to-audio engine to preserve the source musical structure while changing its style.</p>
   {intent==='remix'&&<div className="music-remix-box"><div className="music-source-head"><span>AI SOURCE FINDER</span>{sourceSearching?<b>SEARCHING…</b>:sourceMatch?<b>✓ SOURCE IDENTIFIED</b>:<b>LISTENING FOR A SONG</b>}</div>{sourceMatch?<><div className="music-source-match">{sourceMatch.artworkUrl&&<img src={sourceMatch.artworkUrl} alt=""/>}<div><strong>{sourceMatch.title}</strong><small>{sourceMatch.artist}{sourceMatch.album?' · '+sourceMatch.album:''}</small><small>{sourceMatch.year||'Catalogue match'}</small></div></div>{songDna&&<div className="music-song-dna"><strong>SONG INTELLIGENCE</strong><span>{songDna.genre} · {songDna.era} · {songDna.energy} energy</span><span>{songDna.instrumentation}</span><span>{songDna.structure}</span><small>{songDna.confidence}. Inferred production profile from catalogue metadata; no catalogue audio was copied.</small>{sourceMatch.transformation&&<div className="music-transform-director"><strong>TARGET TRANSFORMATION</strong><span>{sourceMatch.transformation.productionEra} · {sourceMatch.transformation.vocalProfile} · {sourceMatch.transformation.targetGenre}</span><small>{sourceMatch.transformation.instruction}</small></div>}</div>}</>:<small>Type the artist and song naturally. Bikeztagram will identify the catalogue track and build a Song DNA profile for the transformation.</small>}<div className="music-transform-row"><span>Transformation</span><input type="range" min="0.2" max="0.85" step="0.05" value={coverStrength} onChange={e=>setCoverStrength(Number(e.target.value))}/><b>{coverStrength<.45?'RADICAL':coverStrength<.65?'STRONG':'CLOSE'}</b></div><small>{sourceAudio?`✓ ${sourceAudio.name} supplied${sourceDuration?` · ${Math.round(sourceDuration)}s source`:''} — ready for true source-audio transformation.`:sourceMatch?'Song identified. Song Intelligence can reconstruct from catalogue identity and inferred DNA without uploading the catalogue recording. Exact source-audio preservation still requires authorised audio.':'No source identified yet.'}</small>{!sourceAudio&&<div className="music-test-source"><button type="button" onClick={createTestSource} disabled={busy}>⚡ CREATE TEST SOURCE</button><small>Don’t have an audio file? This creates an original 15-second test song, then lets you transform it. No catalogue recording is used.</small></div>}{sourceAudio&&sourcePreviewUrl&&<div className="music-source-preview">{sourceAudio&&<label className="music-upload">SOURCE B — ADD SECOND SONG TO MERGE <input type="file" accept="audio/*" disabled={busy} onChange={e=>setMixAudio(e.target.files?.[0]||null)}/></label>}
   {sourceAudio&&mixAudio&&<div className="music-mashup-box"><div className="music-source-head"><span>MASHUP / MERGE</span><b>✓ TWO SOURCES READY</b></div><label>MODE<select value={mixMode} onChange={e=>setMixMode(e.target.value)} disabled={busy}><option value="layer">LAYER — both songs together</option><option value="crossfade">CROSSFADE — blend A into B</option></select></label><button type="button" className="primary-cta" onClick={mergeSources} disabled={busy}>♫ MERGE THESE SONGS</button><small>This is a true local audio mix: two authorised tracks are decoded, mixed and rendered to a new WAV on the device.</small></div>}
   <div><strong>▶ TEST SOURCE AUDIO</strong><small>Listen to the original source first. When you are happy with it, press TRANSFORM SOURCE below.</small></div><audio controls preload="metadata" src={sourcePreviewUrl}/></div>}{!sourceAudio&&<label className="music-upload">SOURCE A — USE AUTHORISED AUDIO <input type="file" accept="audio/*" disabled={busy} onChange={e=>handleSourceFile(e.target.files?.[0]||null)}/></label>}{buildMusicIntent(prompt).mode==='cross_source'&&<label className="music-upload">SECOND SOURCE / STYLE REFERENCE <input type="file" accept="audio/*" disabled={busy} onChange={e=>setReferenceAudio(e.target.files?.[0]||null)}/></label>}</div>}
   <div className="music-hf-auth"><div><strong>HUGGING FACE AUTHENTICATION</strong><small>Optional. A free Hugging Face token gives MiniMax Music 3 your own ZeroGPU quota instead of the anonymous shared pool.</small></div><input type="password" autoComplete="off" value={huggingFaceToken} onChange={e=>saveHuggingFaceToken(e.target.value)} placeholder="hf_… (stored only on this device)"/>{huggingFaceToken?<small>✓ Hugging Face token saved locally — MiniMax requests will use your authenticated quota.</small>:<small>No token set — anonymous ZeroGPU quota is limited. Create a token at huggingface.co/settings/tokens with read access.</small>}</div><div className="music-vocal-row"><label><input type="checkbox" checked={instrumental} onChange={e=>setInstrumental(e.target.checked)}/> Instrumental</label><label>VOCAL LANGUAGE<select value={vocalLanguage} onChange={e=>setVocalLanguage(e.target.value)} disabled={instrumental}><option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="it">Italian</option><option value="pt">Portuguese</option><option value="ja">Japanese</option><option value="ko">Korean</option></select></label></div>
   <div className="music-lyrics-row"><textarea value={lyrics} onChange={e=>setLyrics(e.target.value)} placeholder={instrumental?'Instrumental — no vocals will be generated':intent==='remix'?'Leave blank and Bikeztagram will create original lyrics for the transformed vocal performance, or write your own…':'Leave blank for AI-written lyrics, or write your own lyrics here…'} disabled={instrumental}/><input value={vocalDirection} onChange={e=>setVocalDirection(e.target.value)} placeholder="Vocal direction: gritty male, soulful female, airy trance…" disabled={instrumental}/></div>
   <div className="music-controls"><label>Length{intent==='remix'&&sourceDuration?<select value={Math.round(sourceDuration)} disabled><option>{Math.round(sourceDuration)} sec · SOURCE</option></select>:<select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value="15">15 sec</option><option value="30">30 sec</option><option value="60">60 sec</option></select>}</label><label>BPM<select value={bpm} onChange={e=>setBpm(e.target.value)}><option value="auto">Auto</option><option>80</option><option>100</option><option>120</option><option>140</option><option>160</option></select></label><label>Key<select value={key} onChange={e=>setKey(e.target.value)}><option value="auto">Auto</option><option>C</option><option>D</option><option>E</option><option>F#</option><option>A</option></select></label><label>Mode<select value={mode} onChange={e=>setMode(e.target.value)}><option value="auto">Auto</option><option>major</option><option>minor</option><option>dorian</option><option>phrygian</option></select></label></div>
   <div className="music-actions"><button className="primary-cta" onClick={()=>make()} disabled={busy||(intent==='remix'&&!sourceMatch)}>{busy?'◌ GENERATING…':intent==='remix'?(sourceAudio?'↻ TRANSFORM AUTHORISED AUDIO':'↻ RECONSTRUCT FROM SONG DNA'):'✦ CREATE SONG'}</button></div>
  </section>}

  {audioUrl&&<div className="music-actions music-output-actions"><div className="music-player" ref={playerRef}><div><strong>{playing?'NOW PLAYING':'GENERATED AUDIO'}</strong><small>{audioMime.includes('mpeg')?'MP3':'WAV'} · {provider||'ACE-Step'}</small></div><audio controls preload="metadata" src={audioUrl} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} /></div><button onClick={preview} disabled={playing}>▶ {playing?'PLAYING':'PLAY'}</button><button onClick={download}>⬇ DOWNLOAD</button><button onClick={useInVideo}>🎬 USE IN VIDEO</button><button onClick={()=>{const item=library.find(x=>x.url===audioUrl)||{id:songId||'current',title:'AI Song',prompt,duration,provider,mimeType:audioMime,createdAt:new Date().toISOString(),blob:null};beginNewVersion(item)}}>✎ MODIFY THIS VERSION</button><button className="full-song-cta" onClick={()=>make({full:true})} disabled={busy}>↗ MAKE FULL SONG</button>{editingVersionId&&<button className="version-note" type="button" onClick={()=>{setEditingVersionId(null);setSourceAudio(null);if(sourcePreviewUrl)URL.revokeObjectURL(sourcePreviewUrl);setSourcePreviewUrl('');setIntent('create');setStatus('✓ VERSION EDITING CLEARED — you are back to the original song creator.')}}>↩ NEW SONG INSTEAD</button>}</div>}
  {status&&<div className="music-stats"><b>{status}</b>{provider&&<span>Engine: {provider}</span>}{songId&&<span>Track ID: {songId}</span>}</div>}
  {project&&<div className="music-actions"><button onClick={downloadProject}>⬇ PROJECT</button><button onClick={()=>downloadStem('drums')}>🥁 STEM</button><button onClick={localDraft}>⚙ LOCAL ARRANGEMENT DRAFT</button><button onClick={()=>window.dispatchEvent(new CustomEvent('bikeztagram:open-arrangement'))}>🎚️ MUSIC LAB</button></div>}
  <section className="music-library"><div className="music-library-head"><strong>YOUR MUSIC</strong><span>{library.length}/12 session tracks</span></div>{library.length?<div className="music-library-list">{library.map(item=><article className="music-track-card" key={item.id}><div className="track-art">♫</div><div className="track-info"><input className="music-track-title-input" value={item.title||'AI Song'} maxLength={80} aria-label="Project name" onChange={e=>renameTrack(item,e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/><small>{item.duration}s · {item.provider}{item.version>1?' · V'+item.version:''}</small><em>{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</em></div><button onClick={()=>loadSaved(item)}>OPEN</button><button onClick={()=>loadSaved(item,{autoplay:true})}>▶ PLAY</button><button onClick={()=>beginNewVersion(item)}>✎ MODIFY</button><button onClick={()=>emitTrack(item)}>USE</button><button className="music-delete" onClick={()=>deleteTrack(item)}>🗑 DELETE</button></article>)}</div>:<p className="music-empty">Your generated songs will appear here.</p>}</section>
  <div className="music-footnote">The simple creator is the default. Describe the idea and Bikeztagram's AI Director handles the musical decisions. Advanced mode exposes remix/source transformation and manual vocal controls when you need them.</div>
 </main>}</>
}