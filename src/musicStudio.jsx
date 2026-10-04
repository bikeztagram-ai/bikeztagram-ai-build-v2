import React,{useEffect,useRef,useState} from 'react';
import {createSongProject,renderStemWav,exportSongProject,validateSongProject} from './musicProjectRuntime.js';
import {renderMusicWav,analyseMusicComposition} from './musicStudioEngineCompatibility.js';
import {generateAIMusic} from './aiMusicProvider.js';
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
 const [open,setOpen]=useState(false),[advancedOpen,setAdvancedOpen]=useState(false),[intent,setIntent]=useState('create'),[prompt,setPrompt]=useState('Create a dark cinematic electronic anthem with deep bass, atmospheric synths, a huge emotional build and an explosive final drop'),[duration,setDuration]=useState(30),[sourceDuration,setSourceDuration]=useState(null),[bpm,setBpm]=useState('auto'),[key,setKey]=useState('auto'),[mode,setMode]=useState('auto'),[lyrics,setLyrics]=useState(''),[instrumental,setInstrumental]=useState(false),[vocalLanguage,setVocalLanguage]=useState('en'),[vocalDirection,setVocalDirection]=useState(''),[sourceAudio,setSourceAudio]=useState(null),[sourcePreviewUrl,setSourcePreviewUrl]=useState(''),[referenceAudio,setReferenceAudio]=useState(null),[sourceMatch,setSourceMatch]=useState(null),[sourceSearching,setSourceSearching]=useState(false),[coverStrength,setCoverStrength]=useState(.55),[project,setProject]=useState(null),[audioUrl,setAudioUrl]=useState(''),[audioMime,setAudioMime]=useState('audio/wav'),[provider,setProvider]=useState(''),[songId,setSongId]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[playing,setPlaying]=useState(false),[library,setLibrary]=useState(readLibrary),audioRef=useRef(null),playerRef=useRef(null);
 useEffect(()=>{const openMusic=()=>setOpen(true);window.addEventListener('bikeztagram:open-music',openMusic);return()=>window.removeEventListener('bikeztagram:open-music',openMusic)},[]);
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
 useEffect(()=>{if(intent!=='remix'||busy)return;const query=extractSourceQuery(prompt);if(query.length<3){setSourceMatch(null);setSourceSearching(false);return}const timer=setTimeout(async()=>{setSourceSearching(true);try{const r=await fetch('/api/music-source?q='+encodeURIComponent(query));const data=await r.json();setSourceMatch(data?.matches?.[0]||null)}catch{setSourceMatch(null)}finally{setSourceSearching(false)}},400);return()=>clearTimeout(timer)},[intent,prompt,busy]);
 useEffect(()=>()=>{if(audioUrl)URL.revokeObjectURL(audioUrl);if(sourcePreviewUrl)URL.revokeObjectURL(sourcePreviewUrl);audioRef.current?.pause?.()},[audioUrl,sourcePreviewUrl]);
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
   if(sourcePreviewUrl)URL.revokeObjectURL(sourcePreviewUrl);setSourceAudio(file);setSourcePreviewUrl(URL.createObjectURL(file));setSourceDuration(d?Math.min(600,Math.max(10,d)):10);setReferenceAudio(null);setSourceMatch(null);setIntent('remix');
   setPrompt('Transform this test source into a deep country version. Preserve its recognisable musical movement and song structure, but use twangy guitars, slide guitar, live country drums, bass and a proper lead vocal. Keep the source identity rather than making generic country music.');
   setInstrumental(false);setLyrics('');setVocalDirection('gritty country lead singer');setProvider(ai.provider);setSongId(ai.songId||'');setStatus('✓ TEST SOURCE READY — now press TRANSFORM SOURCE to test the real source-audio pipeline.');
  }catch(error){setStatus(error?.message||'Could not create the test source.')}
  finally{setBusy(false)}
 };
 const make=async({full=false}={})=>{
  const remixing=intent==='remix';
  const musicIntent=buildMusicIntent(prompt);
  if(remixing&&!sourceAudio){setStatus('SOURCE AUDIO REQUIRED — the song has been identified, but Bikeztagram will not pretend a catalogue preview is a transformable master. Upload an authorised source recording to perform a true source transformation.');return;}
  setBusy(true);setStatus(full?'Building a 60-second full-song draft with ACE-Step…':remixing?(sourceAudio?'Remixing the source audio into your new style with a sung performance…':'Creating an original reinterpretation of the requested remix concept…'):'Generating a real original song with ACE-Step…');
  try{
   const seconds=full?60:remixing&&sourceDuration?Math.min(600,Math.max(10,sourceDuration)):Number(duration);
   const effectiveLyrics=!instrumental&&remixing&&!lyrics.trim()?buildAutoCoverLyrics(prompt):lyrics;
   const brief=remixing
     ? `${prompt}. ${musicIntent.mode==='identity_preserve'?'Preserve the recognisable musical identity, main musical movement, groove, arrangement shape and overall feel of the named source unless the request explicitly replaces one of those elements. Do not turn a source-song request into a merely similar generic song.':musicIntent.mode==='cross_source'?'Treat this as a deliberate cross-source mashup: keep the requested vocal identity/source separate from the requested musical/instrumental identity/source, and combine them only in the roles the user specified.': 'Transform the named source deliberately into the requested genre/style while retaining its recognisable musical skeleton unless the user explicitly asks for a different song identity.'} Rebuild the production around the requested style, with instruments, rhythm, tempo, vocal character and mix appropriate to that style. Avoid generic genre music that loses the source identity.`
     : full?prompt+'. Develop this musical idea into a complete song with a clear intro, evolving sections, a strong chorus/drop and a satisfying ending.':prompt;
   const vocalBrief=!instrumental?(vocalDirection?` Sung vocal direction: ${vocalDirection}.`:' Use a natural lead vocal and sung performance, not spoken narration.'):'';
   const ai=await generateAIMusic({prompt:brief+vocalBrief,durationMs:seconds*1000,forceInstrumental:instrumental,bpm:bpm==='auto'?undefined:Number(bpm),key:key==='auto'?undefined:key,mode:mode==='auto'?undefined:mode,lyrics:effectiveLyrics,vocalLanguage,vocalDirection,sourceAudio:remixing?sourceAudio:null,referenceAudio:remixing?referenceAudio:null,taskType:remixing&&(sourceAudio||referenceAudio)?'cover':'text2music',coverStrength});
   if(audioUrl)URL.revokeObjectURL(audioUrl);
   const url=URL.createObjectURL(ai.blob);setAudioUrl(url);setAudioMime(ai.mimeType);setProvider(ai.provider);setSongId(ai.songId||'');
   const item={id:ai.songId||crypto.randomUUID(),title:full?'Full Song Draft':'AI Song',prompt:brief,duration:seconds,provider:ai.provider,createdAt:new Date().toISOString(),mimeType:ai.mimeType,blob:ai.blob,url};
   setLibrary(prev=>[item,...prev.filter(x=>x.id!==item.id)].slice(0,12));setProvider(ai.provider);setStatus(full?'FULL SONG DRAFT READY — 60 seconds generated.':remixing?'SOURCE TRANSFORM READY — real transformed audio':'AI MUSIC READY — real generated audio');emitTrack(item);
   const p=createSongProject({prompt:brief,duration:seconds,bpm,key,mode});if(validateSongProject(p).ok)setProject(p);
   saveLibrary(item);
  }catch(error){setStatus(error?.message||'ACE-Step music generation failed.')}
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
   <textarea className="music-prompt-hub" value={prompt} onChange={e=>setPrompt(e.target.value)} disabled={busy} aria-label="Describe the song you want" placeholder="e.g. Make a funny upbeat rock song about my dog Bowie who farts all the time and thinks he is the king of the house…"/>
   <div className="music-prompt-hints"><button type="button" onClick={()=>setPrompt('Make a funny upbeat rock song about my dog Bowie who farts all the time and thinks he is the king of the house.')}>🐶 Try an idea</button><button type="button" onClick={()=>setPrompt('Make an emotional cinematic song about riding my motorcycle through the Lake District at sunset.')}>🏍️ Try another</button></div>
   <button className="primary-cta music-create-main" onClick={()=>make()} disabled={busy||(intent==='remix'&&!sourceAudio)}>{busy?'◌ CREATING YOUR SONG…':'✦ CREATE SONG'}</button>
   <button className="music-advanced-toggle" type="button" onClick={()=>setAdvancedOpen(v=>!v)} aria-expanded={advancedOpen}>{advancedOpen?'⌃ HIDE ADVANCED OPTIONS':'⚙ ADVANCED OPTIONS'}<span>{advancedOpen?'Use the simple creator':'Remix, manual lyrics, vocals and technical controls'}</span></button>
  </section>

  {advancedOpen&&<section className="music-advanced-panel">
   <div className="music-intent-tabs"><button className={intent==='create'?'active':''} onClick={()=>setIntent('create')} disabled={busy}>✦ CREATE</button><button className={intent==='remix'?'active':''} onClick={()=>setIntent('remix')} disabled={busy}>↻ REMIX / TRANSFORM</button></div>
   <p className="music-advanced-note">Most people never need these controls. The normal CREATE screen lets the AI Director make the decisions for you.</p>
   {intent==='remix'&&<div className="music-remix-box"><div className="music-source-head"><span>AI SOURCE FINDER</span>{sourceSearching?<b>SEARCHING…</b>:sourceMatch?<b>✓ SOURCE IDENTIFIED</b>:<b>LISTENING FOR A SONG</b>}</div>{sourceMatch?<div className="music-source-match">{sourceMatch.artworkUrl&&<img src={sourceMatch.artworkUrl} alt=""/>}<div><strong>{sourceMatch.title}</strong><small>{sourceMatch.artist}{sourceMatch.album?' · '+sourceMatch.album:''}</small><small>{sourceMatch.year||'Catalogue match'}</small></div></div>:<small>Type the artist and song naturally in your request. Bikeztagram will identify the catalogue track automatically.</small>}<div className="music-transform-row"><span>Transformation</span><input type="range" min="0.2" max="0.85" step="0.05" value={coverStrength} onChange={e=>setCoverStrength(Number(e.target.value))}/><b>{coverStrength<.45?'RADICAL':coverStrength<.65?'STRONG':'CLOSE'}</b></div><small>{sourceAudio?`✓ ${sourceAudio.name} supplied${sourceDuration?` · ${Math.round(sourceDuration)}s source`:''} — ready for true source-audio transformation.`:sourceMatch?'Song identified. An authorised transformable master is still required; catalogue previews are identification/listening references, not transform sources.':'No source identified yet.'}</small>{!sourceAudio&&<div className="music-test-source"><button type="button" onClick={createTestSource} disabled={busy}>⚡ CREATE TEST SOURCE</button><small>Don’t have an audio file? This creates an original 15-second test song, then lets you transform it. No catalogue recording is used.</small></div>}{sourceAudio&&sourcePreviewUrl&&<div className="music-source-preview"><div><strong>▶ TEST SOURCE AUDIO</strong><small>Listen to the original source first. When you are happy with it, press TRANSFORM SOURCE below.</small></div><audio controls preload="metadata" src={sourcePreviewUrl}/></div>}{!sourceAudio&&<label className="music-upload">USE AUTHORISED SOURCE AUDIO <input type="file" accept="audio/*" disabled={busy} onChange={e=>handleSourceFile(e.target.files?.[0]||null)}/></label>}{buildMusicIntent(prompt).mode==='cross_source'&&<label className="music-upload">SECOND SOURCE / STYLE REFERENCE <input type="file" accept="audio/*" disabled={busy} onChange={e=>setReferenceAudio(e.target.files?.[0]||null)}/></label>}</div>}
   <div className="music-vocal-row"><label><input type="checkbox" checked={instrumental} onChange={e=>setInstrumental(e.target.checked)}/> Instrumental</label><label>VOCAL LANGUAGE<select value={vocalLanguage} onChange={e=>setVocalLanguage(e.target.value)} disabled={instrumental}><option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="it">Italian</option><option value="pt">Portuguese</option><option value="ja">Japanese</option><option value="ko">Korean</option></select></label></div>
   <div className="music-lyrics-row"><textarea value={lyrics} onChange={e=>setLyrics(e.target.value)} placeholder={instrumental?'Instrumental — no vocals will be generated':intent==='remix'?'Leave blank and Bikeztagram will create original lyrics for the transformed vocal performance, or write your own…':'Leave blank for AI-written lyrics, or write your own lyrics here…'} disabled={instrumental}/><input value={vocalDirection} onChange={e=>setVocalDirection(e.target.value)} placeholder="Vocal direction: gritty male, soulful female, airy trance…" disabled={instrumental}/></div>
   <div className="music-controls"><label>Length{intent==='remix'&&sourceDuration?<select value={Math.round(sourceDuration)} disabled><option>{Math.round(sourceDuration)} sec · SOURCE</option></select>:<select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value="15">15 sec</option><option value="30">30 sec</option><option value="60">60 sec</option></select>}</label><label>BPM<select value={bpm} onChange={e=>setBpm(e.target.value)}><option value="auto">Auto</option><option>80</option><option>100</option><option>120</option><option>140</option><option>160</option></select></label><label>Key<select value={key} onChange={e=>setKey(e.target.value)}><option value="auto">Auto</option><option>C</option><option>D</option><option>E</option><option>F#</option><option>A</option></select></label><label>Mode<select value={mode} onChange={e=>setMode(e.target.value)}><option value="auto">Auto</option><option>major</option><option>minor</option><option>dorian</option><option>phrygian</option></select></label></div>
   <div className="music-actions"><button className="primary-cta" onClick={()=>make()} disabled={busy||(intent==='remix'&&!sourceAudio)}>{busy?'◌ GENERATING…':intent==='remix'?'↻ TRANSFORM SOURCE':'✦ CREATE SONG'}</button></div>
  </section>}

  {audioUrl&&<div className="music-actions music-output-actions"><div className="music-player" ref={playerRef}><div><strong>{playing?'NOW PLAYING':'GENERATED AUDIO'}</strong><small>{audioMime.includes('mpeg')?'MP3':'WAV'} · {provider||'ACE-Step'}</small></div><audio controls preload="metadata" src={audioUrl} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} /></div><button onClick={preview} disabled={playing}>▶ {playing?'PLAYING':'PLAY'}</button><button onClick={download}>⬇ DOWNLOAD</button><button onClick={useInVideo}>🎬 USE IN VIDEO</button><button className="full-song-cta" onClick={()=>make({full:true})} disabled={busy}>↗ MAKE FULL SONG</button></div>}
  {status&&<div className="music-stats"><b>{status}</b>{provider&&<span>Engine: {provider}</span>}{songId&&<span>Track ID: {songId}</span>}</div>}
  {project&&<div className="music-actions"><button onClick={downloadProject}>⬇ PROJECT</button><button onClick={()=>downloadStem('drums')}>🥁 STEM</button><button onClick={localDraft}>⚙ LOCAL ARRANGEMENT DRAFT</button><button onClick={()=>window.dispatchEvent(new CustomEvent('bikeztagram:open-arrangement'))}>🎚️ MUSIC LAB</button></div>}
  <section className="music-library"><div className="music-library-head"><strong>YOUR MUSIC</strong><span>{library.length}/12 session tracks</span></div>{library.length?<div className="music-library-list">{library.map(item=><article className="music-track-card" key={item.id}><div className="track-art">♫</div><div className="track-info"><strong>{item.title}</strong><small>{item.duration}s · {item.provider}</small><em>{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</em></div><button onClick={()=>loadSaved(item)}>OPEN</button><button onClick={()=>loadSaved(item,{autoplay:true})}>▶ PLAY</button><button onClick={()=>emitTrack(item)}>USE</button></article>)}</div>:<p className="music-empty">Your generated songs will appear here.</p>}</section>
  <div className="music-footnote">The simple creator is the default. Describe the idea and Bikeztagram's AI Director handles the musical decisions. Advanced mode exposes remix/source transformation and manual vocal controls when you need them.</div>
 </main>}</>