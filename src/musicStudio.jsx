import React,{useEffect,useRef,useState} from 'react';
import {createSongProject,renderStemWav,exportSongProject,validateSongProject} from './musicProjectRuntime.js';
import {renderMusicWav,analyseMusicComposition} from './musicStudioEngineCompatibility.js';
import {generateAIMusic} from './aiMusicProvider.js';
import './musicStudio.css';

const LIB_KEY='bikeztagram.music.library.v1';

function readLibrary(){try{return JSON.parse(localStorage.getItem(LIB_KEY)||'[]')}catch{return[]}}
function emitTrack(track){window.dispatchEvent(new CustomEvent('bikeztagram:music-selected',{detail:track}))}

export default function MusicStudio(){
 const [open,setOpen]=useState(false),[prompt,setPrompt]=useState('Create a dark cinematic electronic anthem with deep bass, atmospheric synths, a huge emotional build and an explosive final drop'),[duration,setDuration]=useState(30),[bpm,setBpm]=useState('auto'),[key,setKey]=useState('auto'),[mode,setMode]=useState('auto'),[lyrics,setLyrics]=useState(''),[instrumental,setInstrumental]=useState(false),[project,setProject]=useState(null),[audioUrl,setAudioUrl]=useState(''),[audioMime,setAudioMime]=useState('audio/wav'),[provider,setProvider]=useState(''),[songId,setSongId]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[playing,setPlaying]=useState(false),[library,setLibrary]=useState(readLibrary),audioRef=useRef(null);
 useEffect(()=>{const openMusic=()=>setOpen(true);window.addEventListener('bikeztagram:open-music',openMusic);return()=>window.removeEventListener('bikeztagram:open-music',openMusic)},[]);
 useEffect(()=>()=>{if(audioUrl)URL.revokeObjectURL(audioUrl);audioRef.current?.pause?.()},[audioUrl]);
 const saveLibrary=(item)=>{const next=[item,...library.filter(x=>x.id!==item.id)].slice(0,12);setLibrary(next);try{localStorage.setItem(LIB_KEY,JSON.stringify(next.map(({blob,...meta})=>meta)))}catch{}};
 const make=async({full=false}={})=>{
  setBusy(true);setStatus(full?'Building a longer full-song draft with ACE-Step…':'Generating a real original song with ACE-Step…');
  try{
   const seconds=full?60:Number(duration);
   const brief=full?prompt+'. Develop this musical idea into a complete song with a clear intro, evolving sections, a strong chorus/drop and a satisfying ending.':prompt;
   const ai=await generateAIMusic({prompt:brief,durationMs:seconds*1000,forceInstrumental:instrumental,bpm:bpm==='auto'?undefined:Number(bpm),key:key==='auto'?undefined:key,mode:mode==='auto'?undefined:mode,lyrics});
   if(audioUrl)URL.revokeObjectURL(audioUrl);
   const url=URL.createObjectURL(ai.blob);setAudioUrl(url);setAudioMime(ai.mimeType);setProvider(ai.provider);setSongId(ai.songId||'');
   const item={id:ai.songId||crypto.randomUUID(),title:full?'Full Song Draft':'AI Song',prompt:brief,duration:seconds,provider:ai.provider,createdAt:new Date().toISOString(),mimeType:ai.mimeType,blob:ai.blob,url};
   setLibrary(prev=>[item,...prev.filter(x=>x.id!==item.id)].slice(0,12));setProvider(ai.provider);setStatus(full?'FULL SONG DRAFT READY — 60 seconds generated.':'AI MUSIC READY — real generated audio');emitTrack(item);
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
 const loadSaved=(item)=>{if(item.url){setAudioUrl(item.url);setAudioMime(item.mimeType||'audio/wav');setProvider(item.provider||'ACE-Step 1.5');setPrompt(item.prompt||'');setDuration(Number(item.duration)||30);setStatus('Loaded from this session. Generate again after a page reload to recreate the audio.') }};

 return <>{<button className="music-studio-launch" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>♫ MUSIC</button>}
 {open&&<aside className="music-studio-panel music-studio-panel-wide" aria-label="Standalone Music Studio">
  <div className="music-studio-head"><div><span>BIKEZTAGRAM AI • MUSIC STUDIO</span><h3>Make your own music.</h3></div><button onClick={()=>setOpen(false)} aria-label="Close">×</button></div>
  <p className="music-studio-copy"><b>Write the idea. Get real audio.</b> Create an original track, audition it, save it to your music workspace, make a longer version, or send it straight into Video Creator.</p>
  <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} disabled={busy} aria-label="Describe your music" placeholder="Describe the song you want…"/>
  <div className="music-option-row"><label><input type="checkbox" checked={instrumental} onChange={e=>setInstrumental(e.target.checked)}/> Instrumental</label><input value={lyrics} onChange={e=>setLyrics(e.target.value)} placeholder="Optional lyrics / vocal direction"/></div>
  <div className="music-controls"><label>Length<select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value="15">15 sec</option><option value="30">30 sec</option><option value="60">60 sec</option></select></label><label>BPM<select value={bpm} onChange={e=>setBpm(e.target.value)}><option value="auto">Auto</option><option>80</option><option>100</option><option>120</option><option>140</option><option>160</option></select></label><label>Key<select value={key} onChange={e=>setKey(e.target.value)}><option value="auto">Auto</option><option>C</option><option>D</option><option>E</option><option>F#</option><option>A</option></select></label><label>Mode<select value={mode} onChange={e=>setMode(e.target.value)}><option value="auto">Auto</option><option>major</option><option>minor</option><option>dorian</option><option>phrygian</option></select></label></div>
  <div className="music-actions"><button className="primary-cta" onClick={()=>make()} disabled={busy}>{busy?'◌ GENERATING…':'✦ CREATE SONG'}</button>{audioUrl&&<><button onClick={preview} disabled={playing}>▶ {playing?'PLAYING':'PLAY'}</button><button onClick={download}>⬇ DOWNLOAD</button><button onClick={useInVideo}>🎬 USE IN VIDEO</button></>}{audioUrl&&<button className="full-song-cta" onClick={()=>make({full:true})} disabled={busy}>↗ MAKE FULL SONG</button>}</div>
  {status&&<div className="music-stats"><b>{status}</b>{provider&&<span>Engine: {provider}</span>}{songId&&<span>Track ID: {songId}</span>}</div>}
  {project&&<div className="music-actions"><button onClick={downloadProject}>⬇ PROJECT</button><button onClick={()=>downloadStem('drums')}>🥁 STEM</button><button onClick={localDraft}>⚙ LOCAL ARRANGEMENT DRAFT</button><button onClick={()=>window.dispatchEvent(new CustomEvent('bikeztagram:open-arrangement'))}>🎚️ MUSIC LAB</button></div>}
  <section className="music-library"><div className="music-library-head"><strong>YOUR MUSIC</strong><span>{library.length}/12 session tracks</span></div>{library.length?<div className="music-library-list">{library.map(item=><article className="music-track-card" key={item.id}><div className="track-art">♫</div><div className="track-info"><strong>{item.title}</strong><small>{item.duration}s · {item.provider}</small><em>{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</em></div><button onClick={()=>loadSaved(item)}>OPEN</button><button onClick={()=>emitTrack(item)}>USE</button></article>)}</div>:<p className="music-empty">Your generated songs will appear here.</p>}</section>
  <div className="music-footnote">Original-generation workflow • no commercial music API required • public ZeroGPU worker is the current bootstrap engine.</div>
 </aside>}</>}
