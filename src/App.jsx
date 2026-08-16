/* BIKEZTAGRAM AI — AI Director workflow. Working Blob/Gemini analysis pipeline is preserved. £0 generation path only. */
import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';
import { createAIEditPlan, describeAIEditPlan } from './aiEditPlanner.js';
import { renderProject } from './renderer.js';
import { renderWorldScene } from './worldScene.js';
import './styles.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [prompt, setPrompt] = useState('Analyse this motorcycle footage for the strongest cinematic moments, camera movement, action, composition and best timestamps for an exciting social-media motorcycle video.');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [plan, setPlan] = useState(null);
  const [productionPlan, setProductionPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creatingWorld, setCreatingWorld] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState('');
  const [worldVideoUrl, setWorldVideoUrl] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [currentStage, setCurrentStage] = useState('');
  const errorText = errorDetails ? JSON.stringify(errorDetails, null, 2) : '';

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
    if (worldVideoUrl) URL.revokeObjectURL(worldVideoUrl);
    setFile(selected); setSourceUrl(''); setAnalysis(null); setPlan(null); setProductionPlan(null);
    setRenderedVideoUrl(''); setWorldVideoUrl(''); setProgress(0); setRenderProgress(0); setErrorDetails(null); setCurrentStage('');
    setStatus(selected ? `Selected: ${selected.name}` : '');
  }

  function makeErrorDetails(error, stage) {
    return {
      time: new Date().toISOString(), stage,
      message: error?.message || String(error) || 'Unknown error', name: error?.name || 'UnknownError',
      stack: error?.stack || 'No stack trace available',
      file: file ? { name: file.name, type: file.type, sizeBytes: file.size } : null,
      browser: { online: navigator.onLine, userAgent: navigator.userAgent, url: window.location.href }
    };
  }

  async function buildProductionBlueprint(analysisData) {
    try {
      setCurrentStage('STEP 5B — Building zero-cost AI production blueprint');
      const response = await fetch('/api/production-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, analysis: analysisData, targetDuration: 15 })
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Production planner returned invalid JSON: ${text.slice(0, 500)}`); }
      if (!response.ok) throw new Error(data?.error || `Production planner returned HTTP ${response.status}`);
      if (!data?.productionPlan?.scenes?.length) throw new Error('Production planner returned no scenes.');
      setProductionPlan(data.productionPlan); return data.productionPlan;
    } catch (error) {
      console.warn('[APP] Production blueprint unavailable; keeping existing edit plan.', error);
      setProductionPlan(null); return null;
    }
  }

  async function analyseActualVideo() {
    if (!file) return setStatus('Please choose a video first.');
    if (!file.type.startsWith('video/')) return setStatus('Please select a valid video file.');
    setLoading(true); setProgress(0); setErrorDetails(null); setAnalysis(null); setPlan(null); setProductionPlan(null); setRenderedVideoUrl(''); setWorldVideoUrl(''); setSourceUrl('');
    try {
      setCurrentStage('STEP 1 — Preparing secure Blob upload'); setStatus('Preparing secure Blob upload...');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const pathname = `videos/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const blob = await upload(pathname, file, {
        access: 'public', handleUploadUrl: '/api/upload', multipart: false,
        clientPayload: JSON.stringify({ source: 'bikeztagram-ai', filename: file.name, mimeType: file.type || 'video/mp4', size: file.size }),
        onUploadProgress: (event) => { const value = Number(event?.percentage); if (Number.isFinite(value)) { const p = Math.max(0, Math.min(100, Math.round(value))); setProgress(p); setStatus(`Uploading video to Blob storage... ${p}%`); } }
      });
      if (!blob?.url || !blob?.pathname) throw new Error('Vercel Blob upload did not return a valid URL/pathname.');
      setSourceUrl(blob.url); setProgress(100); setCurrentStage('STEP 2 — Blob upload completed'); setStatus('✅ Video successfully stored in Blob. Preparing Gemini analysis...');
      setCurrentStage('STEP 3 — Sending Blob video URL to /api/analyse');
      const response = await fetch('/api/analyse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: blob.url, pathname: blob.pathname, filename: file.name, mimeType: file.type || 'video/mp4', prompt })
      });
      const text = await response.text(); let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Analysis server returned invalid JSON: ${text.slice(0, 1000)}`); }
      if (!response.ok) throw new Error(data?.error || `Analysis server returned HTTP ${response.status}`);
      if (!data?.analysis) throw new Error('Gemini returned no analysis.');
      setAnalysis(data.analysis); setCurrentStage('STEP 5 — Building AI edit plan'); setStatus('Gemini analysis complete. Building AI edit plan...');
      const generatedPlan = createAIEditPlan(data.analysis, { maxCuts: 8, targetDuration: 15, colorGrade: 'dark-cinematic', creativePrompt: prompt });
      if (!generatedPlan?.cuts?.length) throw new Error('AI edit planner returned no usable cuts.');
      setPlan(generatedPlan); setStatus(`✅ Gemini analysed the actual video. ${describeAIEditPlan(generatedPlan)}`);
      await buildProductionBlueprint(data.analysis);
      setCurrentStage('STEP 5 — AI plans ready'); setStatus(`✅ Gemini analysed the actual video. ${describeAIEditPlan(generatedPlan)} • Zero-cost production blueprint ready.`);
    } catch (error) {
      const details = makeErrorDetails(error, currentStage || 'Unknown stage'); console.error('[APP] ERROR', details); setErrorDetails(details); setStatus(`❌ ERROR — ${details.message}`);
    } finally { setLoading(false); }
  }

  async function createFreeWorldScene() {
    if (!file || !file.type.startsWith('video/')) return setStatus('Choose a video first.');
    if (!sourceUrl) return setStatus('Please analyse the video first so the verified Blob source is available.');
    setCreatingWorld(true); setRenderProgress(0); setErrorDetails(null); setCurrentStage('STEP 6 — Creating zero-cost AI world scene');
    setStatus('✨ Building an original cinematic world around your motorcycle — entirely in the browser...');
    try {
      const outputBlob = await renderWorldScene({ file, sourceUrl, prompt, duration: 6, onProgress: (value) => { const p = Math.max(0, Math.min(100, Number(value) || 0)); setRenderProgress(p); setStatus(`✨ Building AI world scene... ${p}%`); } });
      if (!(outputBlob instanceof Blob) || outputBlob.size === 0) throw new Error('World scene renderer produced an empty video.');
      if (worldVideoUrl) URL.revokeObjectURL(worldVideoUrl); setWorldVideoUrl(URL.createObjectURL(outputBlob)); setRenderProgress(100);
      setCurrentStage('STEP 7 — Zero-cost AI world scene completed'); setStatus(`✅ Original procedural world scene created — ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB.`);
    } catch (error) {
      const details = makeErrorDetails(error, 'STEP 6 — Creating zero-cost AI world scene'); console.error('[APP] WORLD SCENE ERROR', details); setErrorDetails(details); setStatus(`❌ WORLD SCENE ERROR — ${details.message}`);
    } finally { setCreatingWorld(false); }
  }

  function productionPlanToRenderPlan(sourcePlan) {
    if (!sourcePlan?.scenes?.length) return null;
    const cuts = sourcePlan.scenes.map((scene, index) => {
      const uploaded = scene.sourceType === 'uploaded';
      return {
        mediaIndex: 0,
        mediaId: 'video-0',
        startTime: uploaded ? Math.max(0, Number(scene.startTime) || 0) : 0,
        duration: Math.max(0.5, Number(scene.duration) || 1.5),
        purpose: scene.purpose || (uploaded ? 'real-footage' : 'generated-cinematic-fill'),
        sourceType: scene.sourceType || 'uploaded',
        generated: !uploaded,
        generationPrompt: scene.generationPrompt || '',
        transition: scene.transitionIn || (index === 0 ? 'fade-in' : 'crossfade'),
        motionStyle: uploaded ? (index % 2 ? 'pan-right' : 'slow-push') : 'orbit',
        motionIntensity: uploaded ? 0.9 : 1.0,
        speed: uploaded ? 1 : 1,
        speedEnd: uploaded ? 1 : 1,
        colorGrade: sourcePlan.style?.dark ? 'dark-cinematic' : 'cinematic',
        stabilization: true,
        text: ''
      };
    });
    return {
      title: sourcePlan.title || 'AI Director Production',
      style: sourcePlan.title || 'AI Director',
      creativePrompt: sourcePlan.creativeRequest || prompt,
      colorGrade: sourcePlan.style?.dark ? 'dark-cinematic' : 'cinematic',
      cuts,
      duration: cuts.reduce((sum, cut) => sum + cut.duration, 0),
      targetDuration: Number(sourcePlan.targetDuration) || 15,
      source: 'bikeztagram-production-blueprint'
    };
  }

  async function buildAIEdit() {
    if (!file) return setStatus('Please choose a video first.');
    if (!plan?.cuts?.length) return setStatus('No AI edit plan is available yet. Analyse the video first.');
    setRendering(true); setRenderProgress(0); setErrorDetails(null);
    try {
      setCurrentStage('STEP 8 — Rendering AI-directed video'); setStatus(productionPlan ? '🎬 Rendering the AI Director production — real footage + original generative fill...' : '🎬 Building your AI-directed cinematic edit...');
      const renderPlan = productionPlanToRenderPlan(productionPlan) || plan;
      const outputBlob = await renderProject([{ id: 'video-0', file, name: file.name, type: file.type || 'video/mp4', sourceUrl }], renderPlan, (value) => { const p = Math.max(0, Math.min(100, Number(value) || 0)); setRenderProgress(p); setStatus(`🎬 Rendering AI edit... ${p}%`); });
      if (!(outputBlob instanceof Blob) || outputBlob.size === 0) throw new Error('Renderer completed but produced an empty video file.');
      if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl); setRenderedVideoUrl(URL.createObjectURL(outputBlob)); setRenderProgress(100);
      setCurrentStage('STEP 9 — AI edit completed'); setStatus(`✅ AI Director production completed successfully — ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      const details = makeErrorDetails(error, currentStage || 'AI render error'); console.error('[APP] AI RENDER ERROR', details); setErrorDetails(details); setStatus(`❌ RENDER ERROR — ${details.message}`);
    } finally { setRendering(false); }
  }

  function clearVideo() {
    if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl); if (worldVideoUrl) URL.revokeObjectURL(worldVideoUrl);
    setFile(null); setSourceUrl(''); setAnalysis(null); setPlan(null); setProductionPlan(null); setRenderedVideoUrl(''); setWorldVideoUrl(''); setStatus(''); setProgress(0); setRenderProgress(0); setErrorDetails(null); setCurrentStage('');
  }

  const busy = loading || creatingWorld || rendering;
  return <div className="app-container"><header className="app-header"><div><h1>BIKEZTAGRAM AI</h1><p>AI-powered motorcycle video editor</p></div></header><main>
    <section className="form-group"><label htmlFor="video-file">Your source video</label><input id="video-file" type="file" accept="video/*" onChange={handleFileChange} disabled={busy}/>{file && <p className="status-text">{file.name}</p>}</section>
    <section className="form-group"><label htmlFor="analysis-prompt">Tell Bikeztagram what to create</label><textarea id="analysis-prompt" rows="7" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={busy} placeholder="Example: Put my Ninja on Mars at night, chased by three autonomous drones, dust and sparks, aggressive tracking camera, cinematic trailer energy."/></section>
    <div className="button-row"><button className="generate-btn" onClick={analyseActualVideo} disabled={busy || !file}>{loading ? '👁️ Analysing Video...' : '👁️ Analyse Actual Video'}</button>{productionPlan && !busy && <button className="generate-btn" onClick={createFreeWorldScene}>✨ Create Free AI World Scene</button>}{plan && !busy && <button className="generate-btn" onClick={buildAIEdit}>🎬 Build AI Edit</button>}{!busy && file && <button className="clear-btn" onClick={clearVideo}>Clear</button>}</div>
    {busy && <section className="status-panel" style={{marginTop:'15px'}}><p className="status-text">{status}</p><p style={{fontSize:'13px',opacity:0.8}}>{currentStage}</p>{loading && <div>Blob upload: {progress}%</div>}{(rendering || creatingWorld) && <div>Render: {renderProgress}%</div>}{creatingWorld && <div>Browser-only generation — no paid video API.</div>}</section>}
    {!busy && status && !errorDetails && <section className="status-panel" style={{marginTop:'15px'}}><p className="status-text">{status}</p></section>}
    {errorDetails && <section className="status-panel" style={{marginTop:'20px',border:'2px solid #ff4d4d',padding:'15px',borderRadius:'8px'}}><h2>❌ FULL ERROR DETAILS</h2><button className="generate-btn" onClick={async () => { try { await navigator.clipboard.writeText(errorText); setStatus('✅ Error details copied.'); } catch {} }}>📋 Copy Error Details</button><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',fontSize:'12px'}}>{errorText}</pre></section>}
    {analysis && <section className="result-container" style={{marginTop:'20px'}}><h2>Gemini Video Analysis</h2><div className="status-panel"><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(analysis,null,2)}</pre></div></section>}
    {plan && <section className="result-container" style={{marginTop:'20px'}}><h2>🎬 AI Edit Plan</h2><div className="status-panel"><p>{describeAIEditPlan(plan)}</p><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(plan,null,2)}</pre></div></section>}
    {productionPlan && <section className="result-container" style={{marginTop:'20px'}}><h2>🎥 AI Production Blueprint</h2><div className="status-panel"><p>{productionPlan.title || 'AI Production Blueprint'}</p><p>{productionPlan.creativeDirection || ''}</p><p><strong>{productionPlan.scenes.filter((scene) => scene.sourceType === 'uploaded').length}</strong> real scenes • <strong>{productionPlan.scenes.filter((scene) => scene.sourceType === 'generated').length}</strong> generated fill-in scenes planned</p><p>🎬 The production blueprint is now used directly by the final AI render.</p><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(productionPlan,null,2)}</pre></div></section>}
    {worldVideoUrl && <section className="result-container" style={{marginTop:'20px'}}><h2>🌎 Free AI World Scene</h2><div className="status-panel"><video src={worldVideoUrl} controls playsInline autoPlay muted style={{width:'100%',maxWidth:'420px',display:'block',margin:'0 auto',borderRadius:'10px',background:'#000'}}/><p style={{marginTop:'12px'}}>Original procedural environment built inside Bikeztagram from your supplied motorcycle footage. No paid video-generation service is used.</p></div></section>}
    {renderedVideoUrl && <section className="result-container" style={{marginTop:'20px'}}><h2>🏍️ AI Cinematic Edit</h2><div className="status-panel"><video src={renderedVideoUrl} controls playsInline style={{width:'100%',maxWidth:'420px',display:'block',margin:'0 auto',borderRadius:'10px',background:'#000'}}/><p style={{marginTop:'12px'}}>Gemini analysed the real footage. The AI Director built the production blueprint, selected real moments and added original procedural generative-fill scenes before the browser renderer assembled the final video.</p></div></section>}
  </main></div>;
}
