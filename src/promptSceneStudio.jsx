import React, { useEffect, useState } from 'react';
import { generateProceduralSceneV2 } from './proceduralSceneGeneratorV2.js';

const PRESETS = [
  ['cinematic night city', 'A cinematic night city with neon reflections, atmospheric depth and a slow dramatic reveal.'],
  ['desert chase', 'A cinematic desert chase with speed, dust, long shadows and a powerful final beat.'],
  ['cosmic', 'A mysterious cosmic journey through deep space, stars and glowing atmospheric light.'],
  ['mountain road', 'A dramatic mountain road at golden hour, sweeping perspective and premium motorcycle-commercial energy.']
];

const shell = {
  marginTop: 18,
  padding: 18,
  borderRadius: 18,
  border: '1px solid rgba(110,216,255,.18)',
  background: 'linear-gradient(145deg, rgba(8,18,28,.96), rgba(4,9,15,.96))',
  boxShadow: '0 18px 50px rgba(0,0,0,.25)'
};

export default function PromptSceneStudio() {
  const [prompt, setPrompt] = useState(PRESETS[0][1]);
  const [duration, setDuration] = useState(5);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [scene, setScene] = useState(null);

  useEffect(() => () => {
    if (scene?.url) URL.revokeObjectURL(scene.url);
  }, [scene]);

  async function generate() {
    if (!prompt.trim()) {
      setStatus('Describe the scene first.');
      return;
    }
    setBusy(true);
    setProgress(0);
    setStatus('Generating an original scene locally…');
    try {
      if (scene?.url) URL.revokeObjectURL(scene.url);
      const result = await generateProceduralSceneV2({
        prompt: prompt.trim(),
        purpose: 'prompt-to-original-scene',
        duration,
        width: 720,
        height: 1280,
        title: title.trim(),
        onProgress: setProgress
      });
      setScene(result);
      setProgress(100);
      setStatus(`Scene ready • ${result.width}×${result.height} • ${result.duration}s`);
    } catch (error) {
      console.error('[PROMPT SCENE]', error);
      setStatus(`Generation failed — ${error?.message || String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!scene?.blob) return setStatus('Generate a scene first.');
    const url = URL.createObjectURL(scene.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(title.trim() || 'bikeztagram-original-scene').replace(/[^a-z0-9._-]+/gi, '-')}-${scene.width}x${scene.height}.webm`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Scene exported • ${scene.width}×${scene.height}`);
  }

  function useInFilm() {
    if (!scene?.blob) return setStatus('Generate a scene first.');
    const input = document.querySelector('#media-file');
    if (!(input instanceof HTMLInputElement)) return setStatus('Film media input is not available yet.');
    if (typeof DataTransfer === 'undefined') return setStatus('This browser cannot add the generated scene to the media library.');
    const transfer = new DataTransfer();
    for (const file of Array.from(input.files || [])) transfer.items.add(file);
    if (transfer.items.length >= 12) return setStatus('The film library already contains 12 sources. Remove one before adding the generated scene.');
    const filename = `${(title.trim() || 'generated-scene').replace(/[^a-z0-9._-]+/gi, '-').slice(0, 50)}-${Date.now()}.webm`;
    transfer.items.add(new File([scene.blob], filename, { type: scene.blob.type || 'video/webm' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus('✓ Original scene added to the film media library.');
  }

  return (
    <section style={shell} aria-label="Original prompt scene studio">
      <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:11,letterSpacing:1.8,fontWeight:800,opacity:.7}}>ORIGINAL SCENE STUDIO</div>
          <h3 style={{margin:'6px 0 5px',fontSize:22}}>Generate a scene from a prompt</h3>
          <p style={{margin:0,opacity:.72,fontSize:13,maxWidth:650,lineHeight:1.5}}>
            Provider-free, copyright-safe scene generation in the browser. This is a deterministic cinematic generator, not a claim of foundation-model video generation.
          </p>
        </div>
        <span style={{padding:'6px 9px',borderRadius:999,background:'rgba(110,216,255,.1)',fontSize:11,fontWeight:800}}>9:16 ORIGINAL</span>
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'14px 0 10px'}}>
        {PRESETS.map(([label, value]) => (
          <button key={label} type="button" onClick={() => setPrompt(value)} disabled={busy} style={{border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'inherit',borderRadius:999,padding:'7px 10px',fontSize:11,cursor:busy?'default':'pointer'}}>{label}</button>
        ))}
      </div>

      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={busy} rows={4} style={{width:'100%',boxSizing:'border-box',resize:'vertical',background:'rgba(0,0,0,.22)',color:'inherit',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,padding:12,lineHeight:1.45}} />

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
        <label style={{fontSize:12,opacity:.8}}>Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} placeholder="Optional scene title" style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:5,background:'rgba(0,0,0,.22)',color:'inherit',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,padding:10}} />
        </label>
        <label style={{fontSize:12,opacity:.8}}>Duration
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))} disabled={busy} style={{display:'block',width:'100%',marginTop:5,background:'rgba(0,0,0,.22)',color:'inherit',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,padding:10}}>
            {[4,5,6,8,10,12].map((value) => <option key={value} value={value}>{value} seconds</option>)}
          </select>
        </label>
      </div>

      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginTop:12}}>
        <button type="button" onClick={generate} disabled={busy} style={{border:0,borderRadius:10,padding:'11px 15px',fontWeight:900,cursor:busy?'default':'pointer',background:'#6ed8ff',color:'#041019'}}>{busy ? `GENERATING ${progress}%` : '✦ GENERATE ORIGINAL SCENE'}</button>
        {scene && <button type="button" onClick={useInFilm} disabled={busy} style={{border:'1px solid rgba(110,216,255,.28)',borderRadius:10,padding:'10px 14px',fontWeight:900,cursor:'pointer',background:'rgba(110,216,255,.08)',color:'inherit'}}>＋ USE IN MY FILM</button>}
        {scene && <button type="button" onClick={download} disabled={busy} style={{border:'1px solid rgba(255,255,255,.14)',borderRadius:10,padding:'10px 14px',fontWeight:800,cursor:'pointer',background:'rgba(255,255,255,.05)',color:'inherit'}}>⬇ EXPORT SCENE</button>}
        <span style={{fontSize:12,opacity:.7}}>{status}</span>
      </div>

      {busy && <div style={{height:5,background:'rgba(255,255,255,.08)',borderRadius:99,overflow:'hidden',marginTop:12}}><div style={{height:'100%',width:`${progress}%`,background:'#6ed8ff',transition:'width .12s linear'}} /></div>}

      {scene?.url && <div style={{marginTop:15,maxWidth:420}}><video src={scene.url} controls playsInline style={{width:'100%',display:'block',borderRadius:14,background:'#000'}} /></div>}
    </section>
  );
}
