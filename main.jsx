import React, {useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Upload, Sparkles, Camera, Music2, FolderOpen, Wand2, Play, Download, X, Film, ChevronRight, Gauge, Image as ImageIcon} from 'lucide-react';
import {makeEditPlan, makeBetter} from './director';
import {renderProject} from './renderer';
import './styles.css';

const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);

function App(){
  const [media,setMedia]=useState([]);
  const [prompt,setPrompt]=useState('Make a 20-second cinematic motorcycle advert. Build tension, reveal the bike on the music drop, use the strongest moving footage, finish with "New bike. New adventures."');
  const [plan,setPlan]=useState(null);
  const [versions,setVersions]=useState([]);
  const [rendered,setRendered]=useState(null);
  const [rendering,setRendering]=useState(false);
  const [progress,setProgress]=useState(0);
  const [status,setStatus]=useState('Ready');
  const inputRef=useRef();

  const totalSize=useMemo(()=>media.reduce((s,m)=>s+m.file.size,0),[media]);
  const videos=media.filter(m=>m.type.startsWith('video')).length;
  const photos=media.filter(m=>m.type.startsWith('image')).length;

  async function addFiles(files){
    const items=[];
    for(const file of [...files]){
      if(!file.type.startsWith('video/')&&!file.type.startsWith('image/')) continue;
      const base={id:uid(),file,name:file.name,type:file.type,size:file.size,url:URL.createObjectURL(file),duration:0,width:0,height:0};
      if(file.type.startsWith('video/')){
        await new Promise(resolve=>{const v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=()=>{base.duration=v.duration;base.width=v.videoWidth;base.height=v.videoHeight;URL.revokeObjectURL(v.src);resolve()};v.onerror=()=>resolve();v.src=base.url;});
      } else {
        await new Promise(resolve=>{const im=new Image();im.onload=()=>{base.width=im.naturalWidth;base.height=im.naturalHeight;resolve()};im.onerror=()=>resolve();im.src=base.url});
      }
      items.push(base);
    }
    setMedia(m=>[...m,...items]);
    setStatus(`${items.length} file${items.length===1?'':'s'} added locally`);
  }
  function create(){
    if(!media.length){setStatus('Add some photos or videos first.'); return;}
    const p=makeEditPlan(media,prompt);p.version=1;setPlan(p);setVersions([p]);setRendered(null);setStatus(`Director selected ${p.cuts.length} shots.`);
  }
  async function render(){
    if(!plan)return;
    setRendering(true);setStatus('Rendering MP4 locally…');setProgress(0);
    try{const blob=await renderProject(media,plan,setProgress);setRendered({blob,url:URL.createObjectURL(blob),version:plan.version||1});setStatus(`V${plan.version||1} ready`)}catch(e){console.error(e);setStatus(`Render failed: ${e.message||e}`)}finally{setRendering(false)}
  }
  function better(){
    if(!plan){setStatus('Create V1 first.');return;}
    const p=makeBetter(plan,media);setPlan(p);setVersions(v=>[...v,p]);setRendered(null);setStatus(`V${p.version} improved`);
  }
  function remove(id){setMedia(ms=>ms.filter(m=>m.id!==id));}

  return <div className="app">
    <header className="topbar"><div className="brand"><div className="brandMark">B</div><div><strong>BIKEZTAGRAM AI</strong><span>AI FILM EDITOR / V1</span></div></div><div className="statusPill"><i></i>{status}</div></header>
    <main>
      <section className="hero">
        <div className="heroCopy"><div className="eyebrow">FREE-FIRST • LOCAL PROCESSING</div><h1>Give it the footage.<br/><em>Tell it the story.</em></h1><p>Upload everything. The director scores the media, builds a cinematic sequence and renders a real MP4 without sending your raw footage to a storage service.</p></div>
        <div className="heroBike"><div className="grid"></div><span>STORMCLOUD<br/><b>BLUE</b></span></div>
      </section>

      <section className="workspace">
        <div className="leftCol">
          <div className="sectionHead"><div><span className="num">01</span><h2>Footage library</h2></div><span className="muted">{videos} videos • {photos} photos • {(totalSize/1048576).toFixed(1)} MB</span></div>
          <div className="upload" onClick={()=>inputRef.current?.click()}><Upload size={24}/><strong>ADD PHOTOS & VIDEOS</strong><span>Bulk select from Android • stays in your browser</span><input ref={inputRef} hidden type="file" multiple accept="image/*,video/*" onChange={e=>addFiles(e.target.files)}/></div>
          {media.length>0&&<div className="mediaGrid">{media.map(m=><div className="mediaCard" key={m.id}><button onClick={()=>remove(m.id)}><X size={14}/></button>{m.type.startsWith('video')?<video src={m.url} muted playsInline/>:<img src={m.url}/>}<div><b>{m.name}</b><span>{m.type.startsWith('video')?`${m.duration.toFixed(1)}s video`:'photo'}</span></div></div>)}</div>}
          {!media.length&&<div className="empty"><Film size={28}/><span>Your footage will appear here.</span></div>}
        </div>
        <div className="rightCol">
          <div className="sectionHead"><div><span className="num">02</span><h2>AI Director</h2></div><Sparkles size={18}/></div>
          <div className="chatCard"><div className="aiLine"><div className="aiAvatar">AI</div><div><b>What do you want me to create?</b><span>I’ll turn your words into an edit plan.</span></div></div><textarea value={prompt} onChange={e=>setPrompt(e.target.value)}/><div className="quick"><button onClick={()=>setPrompt('Make a cinematic 20-second motorcycle transformation. Start dark and nostalgic, build tension, reveal the new bike on the music drop, then finish with a hero shot.')}>Z800 → NINJA REVEAL</button><button onClick={()=>setPrompt('Make a fast 15-second biker edit. Strong first second, aggressive pacing, action corners, engine moments and a hard hero ending.')}>BIKER MODE</button></div><button className="primary" onClick={create}><Sparkles size={18}/> CREATE CINEMATIC VIDEO <ChevronRight size={18}/></button></div>
          <div className="tools"><Tool icon={<Camera/>} title="EDIT PHOTO" note="Frame extraction + future AI photo tools"/><Tool icon={<Music2/>} title="MUSIC" note="Original local pulse in V1 • catalogue hook ready"/><Tool icon={<FolderOpen/>} title="PROJECTS" note="Metadata + version history"/></div>
        </div>
      </section>

      {plan&&<section className="editSection"><div className="sectionHead"><div><span className="num">03</span><h2>Director timeline</h2></div><span className="version">V{plan.version}</span></div><div className="timeline"><div className="timelineRail">{plan.cuts.map((c,i)=><div className={`cut ${c.role==='REVEAL'?'reveal':''}`} key={c.id} style={{flex:`${c.duration} 0 0`}}><span>{c.role}</span><b>{c.name}</b><small>{c.duration.toFixed(1)}s • score {c.score}</small></div>)}</div><div className="musicRail"><Music2 size={14}/> ORIGINAL PULSE • 112 BPM • beat-aware architecture</div></div><div className="planNotes">{plan.notes?.slice(-5).map((n,i)=><div key={i}>✓ {n}</div>)}</div></section>}

      <section className="renderSection"><div className="sectionHead"><div><span className="num">04</span><h2>Preview & improve</h2></div><span className="muted">Real MP4 • 1080 × 1920 • 30fps</span></div><div className="previewWrap">{rendered?<video className="preview" controls src={rendered.url}/>:<div className="previewPlaceholder"><Play size={30}/><span>{plan?'Render V'+plan.version+' to preview':'Create a video plan to begin'}</span></div>}<div className="previewActions"><button className="secondary" onClick={render} disabled={!plan||rendering}><Play size={16}/>{rendering?`RENDERING ${progress}%`:'RENDER MP4'}</button><button className="better" onClick={better} disabled={!plan}><Wand2 size={17}/> MAKE IT BETTER</button>{rendered&&<a className="download" download={`bikeztagram-ai-v${rendered.version}.mp4`} href={rendered.url}><Download size={16}/> SAVE MP4</a>}</div></div></section>

      {versions.length>0&&<section className="versions"><div className="sectionHead"><div><span className="num">05</span><h2>Versions</h2></div><span className="muted">Compare your iterations</span></div><div className="versionGrid">{versions.map(v=><button key={v.version} onClick={()=>{setPlan(v);setRendered(null)}} className={plan.version===v.version?'active':''}><span>V{v.version}</span><b>{v.cuts.length} shots</b><small>{v.critique?.length?v.critique[0]:'Original director cut'}</small></button>)}</div></section>}

      <footer><div>BIKEZTAGRAM AI <span>V0.1 • FREE-FIRST</span></div><p>Local media • no cloud library • no copyrighted music scraping • designed for HTTPS/Vercel</p></footer>
    </main>
  </div>
}
function Tool({icon,title,note}){return <div className="tool"><div>{React.cloneElement(icon,{size:17})}</div><b>{title}</b><span>{note}</span></div>}
createRoot(document.getElementById('root')).render(<App/>);
