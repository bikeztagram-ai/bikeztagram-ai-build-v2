/* BIKEZTAGRAM AI — AI Director workflow. Working Blob/Gemini analysis pipeline is preserved. */
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
  const [creatingFillIn, setCreatingFillIn] = useState(false);
  const [generatingScene, setGeneratingScene] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState('');
  const [fillInUrl, setFillInUrl] = useState('');
  const [generatedSceneUrl, setGeneratedSceneUrl] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [currentStage, setCurrentStage] = useState('');
  const errorText = errorDetails ? JSON.stringify(errorDetails, null, 2) : '';

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
    if (fillInUrl) URL.revokeObjectURL(fillInUrl);
    setFile(selected); setSourceUrl(''); setAnalysis(null); setPlan(null); setProductionPlan(null);
    setRenderedVideoUrl(''); setFillInUrl(''); setGeneratedSceneUrl(''); setProgress(0); setRenderProgress(0); setErrorDetails(null); setCurrentStage(''); setStatus(selected ? `Selected: ${selected.name}` : '');
  }

  function makeErrorDetails(error, stage) {
    return { time: new Date().toISOString(), stage, message: error?.message || String(error) || 'Unknown error', name: error?.name || 'UnknownError', stack: error?.stack || 'No stack trace available', file: file ? { name: file.name, type: file.type, sizeBytes: file.size } : null, browser: { online: navigator.onLine, userAgent: navigator.userAgent, url: window.location.href } };
  }

  async function buildProductionBlueprint(analysisData) {
    try {
      setCurrentStage('STEP 5B — Building zero-cost AI production blueprint');
      const response = await fetch('/api/production-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, analysis: analysisData, targetDuration: 15 }) });
      const text = await response.text(); let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Production planner returned invalid JSON: ${text.slice(0, 500)}`); }
      if (!response.ok) throw new Error(data?.error || `Production planner returned HTTP ${response.status}`);
      if (!data?.productionPlan?.scenes?.length) throw new Error('Production planner returned no scenes.');
      setProductionPlan(data.productionPlan); return data.productionPlan;
    } catch (error) { console.warn('[APP] Production blueprint unavailable; keeping existing edit plan.', error); setProductionPlan(null); return null; }
  }

  async function analyseActualVideo() {
    if (!file) return setStatus('Please choose a video first.');
    if (!file.type.startsWith('video/')) return setStatus('Please select a valid video file.');
    setLoading(true); setProgress(0); setErrorDetails(null); setAnalysis(null); setPlan(null); setProductionPlan(null); setRenderedVideoUrl(''); setFillInUrl(''); setSourceUrl('');
    try {
      setCurrentStage('STEP 1 — Preparing secure Blob upload'); setStatus('Preparing secure Blob upload...');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); const pathname = `videos/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const blob = await upload(pathname, file, { access: 'public', handleUploadUrl: '/api/upload', multipart: true, clientPayload: JSON.stringify({ source: 'bikeztagram-ai', filename: file.name, mimeType: file.type || 'video/mp4', size: file.size }), onUploadProgress: (event) => { const value = Number(event?.percentage); if (Number.isFinite(value)) { const p = Math.max(0, Math.min(100, Math.round(value))); setProgress(p); setStatus(`Uploading video to Blob storage... ${p}%`); } } });
      if (!blob?.url || !blob?.pathname) throw new Error('Vercel Blob upload did not return a valid URL/pathname.');
      setSourceUrl(blob.url); setProgress(100); setCurrentStage('STEP 2 — Blob upload completed'); setStatus('✅ Video successfully stored in Blob. Preparing Gemini analysis...'); setCurrentStage('STEP 3 — Sending Blob video URL to /api/analyse');
      const response = await fetch('/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: blob.url, pathname: blob.pathname, filename: file.name, mimeType: file.type || 'video/mp4', prompt }) });
      const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw new Error(`Analysis server returned invalid JSON: ${text.slice(0, 1000)}`); }
      if (!response.ok) throw new Error(data?.error || `Analysis server returned HTTP ${response.status}`); if (!data?.analysis) throw new Error('Gemini returned no analysis.');
      setAnalysis(data.analysis); setCurrentStage('STEP 5 — Building AI edit plan'); setStatus('Gemini analysis complete. Building AI edit plan...');
      const generatedPlan = createAIEditPlan(data.analysis, { maxCuts: 8, targetDuration: 15, colorGrade: 'dark-cinematic', creativePrompt: prompt });
      if (!generatedPlan?.cuts?.length) throw new Error('AI edit planner returned no usable cuts.');
      setPlan(generatedPlan); setStatus(`✅ Gemini analysed the actual video. ${describeAIEditPlan(generatedPlan)}`); await buildProductionBlueprint(data.analysis); setCurrentStage('STEP 5 — AI plans ready'); setStatus(`✅ Gemini analysed the actual video. ${describeAIEditPlan(generatedPlan)} • Zero-cost production blueprint ready.`);
    } catch (error) { const details = makeErrorDetails(error, currentStage || 'Unknown stage'); console.error('[APP] ERROR', details); setErrorDetails(details); setStatus(`❌ ERROR — ${details.message}`); } finally { setLoading(false); }
  }

  async function createFreeFillIn() {
    if (!file || !file.type.startsWith('video/')) return setStatus('Choose a video first.');
    if (!sourceUrl) return setStatus('Please analyse the video first so the verified Blob source is available.');
    setCreatingFillIn(true); setErrorDetails(null); setCurrentStage('STEP 6 — Creating zero-cost AI world scene'); setStatus('✨ Building an original cinematic world around your motorcycle — entirely in the browser...');
    try {
      const outputBlob = await renderWorldScene({ file, sourceUrl, prompt, duration: 6, onProgress: (value) => { const p = Math.max(0, Math.min(100, Number(value) || 0)); setRenderProgress(p); setStatus(`✨ Building AI world scene... ${p}%`); } });
      if (!(outputBlob instanceof Blob) || outputBlob.size === 0) throw new Error('World scene renderer produced an empty video.');
      if (fillInUrl) URL.revokeObjectURL(fillInUrl); setFillInUrl(URL.createObjectURL(outputBlob)); setRenderProgress(100); setCurrentStage('STEP 7 — Zero-cost AI world scene completed'); setStatus(`✅ Original procedural world scene created — ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB.`);
    } catch (error) { const details = makeErrorDetails(error, 'STEP 6 — Creating zero-cost AI world scene'); console.error('[APP] WORLD SCENE ERROR', details); setErrorDetails(details); setStatus(`❌ WORLD SCENE ERROR — ${details.message}`); } finally { setCreatingFillIn(false); }
  }

  async function makeReferenceImage() {
    if (!file) throw new Error('Choose a video or image first.');
    if (file.type.startsWith('image/')) {
      const bitmap = await createImageBitmap(file);
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      return await new Promise((resolve, reject) => canvas.toBlob(async (blob) => { if (!blob) return reject(new Error('Could not compress image.')); resolve({ bytes: await blob.arrayBuffer(), mimeType: 'image/jpeg' }); }, 'image/jpeg', 0.86));
    }
    if (!file.type.startsWith('video/')) throw new Error('Supported inputs are video or image files.');
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'metadata'; video.src = url;
      await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Timed out preparing the video reference frame.')), 15000); video.onloadedmetadata = () => { clearTimeout(timer); resolve(); }; video.onerror = () => { clearTimeout(timer); reject(new Error('Could not decode the selected video.')); }; });
      const preferredStart = Number(plan?.cuts?.[0]?.start); video.currentTime = Number.isFinite(preferredStart) ? Math.max(0, Math.min(preferredStart, Math.max(0, video.duration - 0.1))) : Math.max(0, Math.min(video.duration * 0.35, Math.max(0, video.duration - 0.1)));
      await new Promise((resolve) => { video.onseeked = resolve; });
      const canvas = document.createElement('canvas'); const maxW = 900; const scale = Math.min(1, maxW / video.videoWidth); canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve, reject) => canvas.toBlob(async (blob) => { if (!blob) return reject(new Error('Could not create video reference frame.')); resolve({ bytes: await blob.arrayBuffer(), mimeType: 'image/jpeg' }); }, 'image/jpeg', 0.86));
    } finally { URL.revokeObjectURL(url); }
  }

  async function generateRealAIScene() {
    if (!file) return setStatus('Choose a video or image first.');
    setGeneratingScene(true); setRenderProgress(0); setErrorDetails(null); setCurrentStage('STEP 6 — Preparing reference image for Veo'); setStatus('🎥 Preparing the supplied video frame/image for real AI scene generation...');
    try {
      const reference = await makeReferenceImage();
      const bytes = new Uint8Array(reference.bytes); let binary = ''; const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
      const imageBytes = btoa(binary);
      setCurrentStage('STEP 7 — Starting Veo cinematic generation'); setStatus('🎬 Veo is generating the new world around your supplied motorcycle...');
      const startResponse = await fetch('/api/generate-scene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBytes, mimeType: reference.mimeType, prompt, durationSeconds: '6' }) });
      const startText = await startResponse.text(); let startData; try { startData = JSON.parse(startText); } catch { throw new Error(`Veo start returned invalid JSON: ${startText.slice(0, 500)}`); }
      if (!startResponse.ok) throw new Error(startData?.error || `Veo start returned HTTP ${startResponse.status}`);
      const operation = startData.operation; if (!operation) throw new Error('Veo did not return an operation ID.');
      for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 8000));
        const poll = await fetch(`/api/generate-scene?operation=${encodeURIComponent(operation)}`); const text = await poll.text(); let data; try { data = JSON.parse(text); } catch { throw new Error(`Veo status returned invalid JSON: ${text.slice(0, 500)}`); }
        if (!poll.ok) throw new Error(data?.error || `Veo status returned HTTP ${poll.status}`);
        const percent = Math.min(95, 10 + Math.round((attempt / 39) * 85)); setRenderProgress(percent); setStatus(`🎬 Generating cinematic AI scene... ${percent}%`);
        if (data.status === 'completed' && data.videoUrl) { setGeneratedSceneUrl(data.videoUrl); setRenderProgress(100); setCurrentStage('STEP 8 — Real AI scene completed'); setStatus('✅ Real AI cinematic scene generated from your supplied video/image.'); return; }
        if (data.status === 'failed') throw new Error(data.error || 'Veo generation failed.');
      }
      throw new Error('Veo generation is taking longer than expected. The operation may still be running; try Generate REAL AI Scene again after a short wait.');
    } catch (error) { const details = makeErrorDetails(error, currentStage || 'AI scene generation'); console.error('[APP] VEO SCENE ERROR', details); setErrorDetails(details); setStatus(`❌ AI SCENE ERROR — ${details.message}`); } finally { setGeneratingScene(false); }
  }

  async function buildAIEdit() {
    if (!file) return setStatus('Please choose a video first.'); if (!plan?.cuts?.length) return setStatus('No AI edit plan is available yet. Analyse the video first.');
    setRendering(true); setRenderProgress(0); setErrorDetails(null);
    try {
      setCurrentStage('STEP 9 — Rendering AI-directed video'); setStatus('🎬 Building your AI-directed cinematic edit...');
      const outputBlob = await renderProject([{ id: 'video-0', file, name: file.name, type: file.type || 'video/mp4', sourceUrl }], plan, (value) => { const p = Math.max(0, Math.min(100, Number(value) || 0)); setRenderProgress(p); setStatus(`🎬 Rendering AI edit... ${p}%`); });
      if (!(outputBlob instanceof Blob) || outputBlob.size === 0) throw new Error('Renderer completed but produced an empty video file.');
      if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl); setRenderedVideoUrl(URL.createObjectURL(outputBlob)); setRenderProgress(100); setCurrentStage('STEP 10 — AI edit completed'); setStatus(`✅ AI edit completed successfully — ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) { const details = makeErrorDetails(error, currentStage || 'AI render error'); console.error('[APP] AI RENDER ERROR', details); setErrorDetails(details); setStatus(`❌ RENDER ERROR — ${details.message}`); } finally { setRendering(false); }
  }

  function clearVideo() { if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl); if (fillInUrl) URL.revokeObjectURL(fillInUrl); setFile(null); setSourceUrl(''); setAnalysis(null); setPlan(null); setProductionPlan(null); setRenderedVideoUrl(''); setFillInUrl(''); setGeneratedSceneUrl(''); setStatus(''); setProgress(0); setRenderProgress(0); setErrorDetails(null); setCurrentStage(''); }

  const busy = loading || creatingFillIn || generatingScene || rendering;
  return <div className="app-container"><header className="app-header"><div><h1>BIKEZTAGRAM AI</h1><p>AI-powered motorcycle video editor</p></div></header><main>
    <section className="form-group"><label htmlFor="video-file">Your source video or picture</label><input id="video-file" type="file" accept="video/*,image/*" onChange={handleFileChange} disabled={busy}/>{file && <p className="status-text">{file.name}</p>}</section>
    <section className="form-group"><label htmlFor="analysis-prompt">Tell Bikeztagram what to create</label><textarea id="analysis-prompt" rows="7" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={busy} placeholder="Example: Put my Ninja on Mars at night, chased by three autonomous drones, dust and sparks, aggressive tracking camera, cinematic trailer energy."/></section>
    <div className="button-row">
      {file?.type?.startsWith('video/') && <button className="generate-btn" onClick={analyseActualVideo} disabled={busy || !file}>{loading ? '👁️ Analysing Video...' : '👁️ Analyse Actual Video'}</button>}
      {file && <button className="generate-btn" onClick={generateRealAIScene} disabled={busy}>{generatingScene ? '🎬 Generating AI Scene...' : '🎬 Generate REAL AI Scene'}</button>}
      {productionPlan && !busy && <button className="generate-btn" onClick={createFreeFillIn}>✨ Procedural World Test</button>}
      {plan && !busy && <button className="generate-btn" onClick={buildAIEdit}>🎬 Build AI Edit</button>}
      {!busy && file && <button className="clear-btn" onClick={clearVideo}>Clear</button>}
    </div>
    {busy && <section className="status-panel" style={{marginTop:'15px'}}><p className="status-text">{status}</p><p style={{fontSize:'13px',opacity:0.8}}>{currentStage}</p>{loading && <div>Blob upload: {progress}%</div>}{(rendering || creatingFillIn || generatingScene) && <div>Generation/render: {renderProgress}%</div>}{generatingScene && <div>Real AI generation uses Veo and may incur Google API charges.</div>}</section>}
    {!busy && status && !errorDetails && <section className="status-panel" style={{marginTop:'15px'}}><p className="status-text">{status}</p></section>}
    {errorDetails && <section className="status-panel" style={{marginTop:'20px',border:'2px solid #ff4d4d',padding:'15px',borderRadius:'8px'}}><h2>❌ FULL ERROR DETAILS</h2><button className="generate-btn" onClick={async () => { try { await navigator.clipboard.writeText(errorText); setStatus('✅ Error details copied.'); } catch {} }}>📋 Copy Error Details</button><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',fontSize:'12px'}}>{errorText}</pre></section>}
    {analysis && <section className="result-container" style={{marginTop:'20px'}}><h2>Gemini Video Analysis</h2><div className="status-panel"><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(analysis,null,2)}</pre></div></section>}
    {plan && <section className="result-container" style={{marginTop:'20px'}}><h2>🎬 AI Edit Plan</h2><div className="status-panel"><p>{describeAIEditPlan(plan)}</p><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(plan,null,2)}</pre></div></section>}
    {productionPlan && <section className="result-container" style={{marginTop:'20px'}}><h2>🎥 AI Production Blueprint</h2><div className="status-panel"><p>{productionPlan.title || 'AI Production Blueprint'}</p><p>{productionPlan.creativeDirection || ''}</p><p><strong>{productionPlan.scenes.filter((scene) => scene.sourceType === 'uploaded').length}</strong> real scenes • <strong>{productionPlan.scenes.filter((scene) => scene.sourceType === 'generated').length}</strong> generated fill-in scenes planned</p><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(productionPlan,null,2)}</pre></div></section>}
    {generatedSceneUrl && <section className="result-container" style={{marginTop:'20px'}}><h2>🌎 REAL AI GENERATED SCENE</h2><div className="status-panel"><video src={generatedSceneUrl} controls playsInline autoPlay muted style={{width:'100%',maxWidth:'420px',display:'block',margin:'0 auto',borderRadius:'10px',background:'#000'}}/><p style={{marginTop:'12px'}}>Generated by Veo from your supplied video frame/image and creative direction. This is the path toward full AI world creation.</p></div></section>}
    {fillInUrl && <section className="result-container" style={{marginTop:'20px'}}><h2>✨ Procedural World Test</h2><div className="status-panel"><video src={fillInUrl} controls playsInline autoPlay muted style={{width:'100%',maxWidth:'420px',display:'block',margin:'0 auto',borderRadius:'10px',background:'#000'}}/><p style={{marginTop:'12px'}}>Original procedural environment built inside Bikeztagram from your supplied motorcycle footage.</p></div></section>}
    {renderedVideoUrl && <section className="result-container" style={{marginTop:'20px'}}><h2>🏍️ AI Cinematic Edit</h2><div className="status-panel"><video src={renderedVideoUrl} controls playsInline style={{width:'100%',maxWidth:'420px',display:'block',margin:'0 auto',borderRadius:'10px',background:'#000'}}/><p style={{marginTop:'12px'}}>Gemini selected the moments. The AI edit planner converted them into cuts, timing, speed, transitions and motion, and the browser renderer built the video.</p></div></section>}
  </main></div>;
}
