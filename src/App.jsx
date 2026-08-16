/* BIKEZTAGRAM AI — zero-cost AI Director workflow. Blob/Gemini upload and proven renderer are preserved. */
import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';
import { createAIEditPlan, describeAIEditPlan } from './aiEditPlanner.js';
import { renderProject } from './renderer.js';
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
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState('');
  const [fillInUrl, setFillInUrl] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [currentStage, setCurrentStage] = useState('');
  const errorText = errorDetails ? JSON.stringify(errorDetails, null, 2) : '';

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
    if (fillInUrl) URL.revokeObjectURL(fillInUrl);
    setFile(selected);
    setSourceUrl('');
    setAnalysis(null);
    setPlan(null);
    setProductionPlan(null);
    setRenderedVideoUrl('');
    setFillInUrl('');
    setProgress(0);
    setRenderProgress(0);
    setErrorDetails(null);
    setCurrentStage('');
    setStatus(selected ? `Selected: ${selected.name}` : '');
  }

  function makeErrorDetails(error, stage) {
    return {
      time: new Date().toISOString(),
      stage,
      message: error?.message || String(error) || 'Unknown error',
      name: error?.name || 'UnknownError',
      stack: error?.stack || 'No stack trace available',
      file: file ? { name: file.name, type: file.type, sizeBytes: file.size } : null,
      browser: { online: navigator.onLine, userAgent: navigator.userAgent, url: window.location.href }
    };
  }

  async function buildProductionBlueprint(analysisData) {
    try {
      setCurrentStage('STEP 5B — Building zero-cost AI production blueprint');
      const response = await fetch('/api/production-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, analysis: analysisData, targetDuration: 15 })
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Production planner returned invalid JSON: ${text.slice(0, 500)}`); }
      if (!response.ok) throw new Error(data?.error || `Production planner returned HTTP ${response.status}`);
      if (!data?.productionPlan?.scenes?.length) throw new Error('Production planner returned no scenes.');
      setProductionPlan(data.productionPlan);
      return data.productionPlan;
    } catch (error) {
      console.warn('[APP] Production blueprint unavailable; keeping existing edit plan.', error);
      setProductionPlan(null);
      return null;
    }
  }

  async function analyseActualVideo() {
    if (!file) return setStatus('Please choose a video first.');
    if (!file.type.startsWith('video/')) return setStatus('Please select a valid video file.');
    setLoading(true);
    setProgress(0);
    setErrorDetails(null);
    setAnalysis(null);
    setPlan(null);
    setProductionPlan(null);
    setRenderedVideoUrl('');
    setFillInUrl('');
    setSourceUrl('');
    try {
      setCurrentStage('STEP 1 — Preparing secure Blob upload');
      setStatus('Preparing secure Blob upload...');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const pathname = `videos/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        multipart: true,
        clientPayload: JSON.stringify({ source: 'bikeztagram-ai', filename: file.name, mimeType: file.type || 'video/mp4', size: file.size }),
        onUploadProgress: (event) => {
          const value = Number(event?.percentage);
          if (Number.isFinite(value)) {
            const p = Math.max(0, Math.min(100, Math.round(value)));
            setProgress(p);
            setStatus(`Uploading video to Blob storage... ${p}%`);
          }
        }
      });
      if (!blob?.url || !blob?.pathname) throw new Error('Vercel Blob upload did not return a valid URL/pathname.');
      setSourceUrl(blob.url);
      setProgress(100);
      setCurrentStage('STEP 2 — Blob upload completed');
      setStatus('✅ Video successfully stored in Blob. Preparing Gemini analysis...');
      setCurrentStage('STEP 3 — Sending Blob video URL to /api/analyse');
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: blob.url, pathname: blob.pathname, filename: file.name, mimeType: file.type || 'video/mp4', prompt })
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`Analysis server returned invalid JSON: ${text.slice(0, 1000)}`); }
      if (!response.ok) throw new Error(data?.error || `Analysis server returned HTTP ${response.status}`);
      if (!data?.analysis) throw new Error('Gemini returned no analysis.');
      setAnalysis(data.analysis);
      setCurrentStage('STEP 5 — Building AI edit plan');
      setStatus('Gemini analysis complete. Building AI edit plan...');
      const generatedPlan = createAIEditPlan(data.analysis, { maxCuts: 8, targetDuration: 15, colorGrade: 'dark-cinematic' });
      if (!generatedPlan?.cuts?.length) throw new Error('AI edit planner returned no usable cuts.');
      setPlan(generatedPlan);
      setStatus(`✅ Gemini analysed the actual video. ${describeAIEditPlan(generatedPlan)}`);
      await buildProductionBlueprint(data.analysis);
      setCurrentStage('STEP 5 — AI plans ready');
      setStatus(`✅ Gemini analysed the actual video. ${describeAIEditPlan(generatedPlan)} • Zero-cost production blueprint ready.`);
    } catch (error) {
      const details = makeErrorDetails(error, currentStage || 'Unknown stage');
      console.error('[APP] ERROR', details);
      setErrorDetails(details);
      setStatus(`❌ ERROR — ${details.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function createFreeFillIn() {
    if (!file) return setStatus('Please choose a video first.');
    setCreatingFillIn(true);
    setErrorDetails(null);
    setCurrentStage('STEP 6 — Creating zero-cost cinematic fill-in');
    setStatus('✨ Creating a free cinematic fill-in from your supplied footage...');
    let localObjectUrl = '';
    try {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      // Prefer the already-proven public Blob URL. The main renderer can decode this
      // source on Android, so the free fill-in should use the same known-good source.
      // Keep a local-file fallback without changing the Blob/Gemini upload pipeline.
      let source = sourceUrl;
      if (!source) {
        localObjectUrl = URL.createObjectURL(file);
        source = localObjectUrl;
      }
      video.src = source;
      video.load();

      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          video.onloadedmetadata = null;
          video.onloadeddata = null;
          video.onerror = null;
          fn(value);
        };
        const timeout = setTimeout(() => finish(reject, new Error('Timed out loading the Blob source for the free fill-in.')), 15000);
        video.onloadedmetadata = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) finish(resolve);
        };
        video.onloadeddata = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) finish(resolve);
        };
        video.onerror = () => {
          const code = video.error?.code ? ` (media error code ${video.error.code})` : '';
          finish(reject, new Error(`Could not decode the Blob source video for the free fill-in${code}.`));
        };
      });

      const sourceDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
      const seekTarget = Math.min(Math.max(0.25, sourceDuration * 0.22), Math.max(0.25, sourceDuration - 0.05));
      video.currentTime = seekTarget;
      await new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          video.onseeked = null;
          resolve();
        };
        video.onseeked = finish;
        setTimeout(finish, 1500);
      });

      const canvas = document.createElement('canvas');
      const targetWidth = 1080;
      const ratio = (video.videoWidth || 1080) / Math.max(1, video.videoHeight || 1920);
      canvas.width = targetWidth;
      canvas.height = Math.round(targetWidth / Math.max(0.45, ratio));
      if (canvas.height > 1920) canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create the free fill-in canvas.');

      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const stream = canvas.captureStream(30);
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      const stopped = new Promise((resolve, reject) => {
        recorder.onerror = () => reject(new Error('Browser recorder failed while creating the free fill-in.'));
        recorder.onstop = resolve;
      });
      recorder.start(1000);

      const durationMs = 4500;
      const started = performance.now();
      await new Promise((resolve) => {
        const draw = () => {
          const p = Math.max(0, Math.min(1, (performance.now() - started) / durationMs));
          const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          const sw = video.videoWidth || 1080;
          const sh = video.videoHeight || 1920;
          const sourceRatio = sw / sh;
          const canvasRatio = canvas.width / canvas.height;
          let w, h;
          if (sourceRatio > canvasRatio) { h = canvas.height * (1.03 + eased * 0.11); w = h * sourceRatio; }
          else { w = canvas.width * (1.03 + eased * 0.11); h = w / sourceRatio; }
          const x = (canvas.width - w) / 2 + (eased - 0.5) * canvas.width * 0.06;
          const y = (canvas.height - h) / 2;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.filter = 'brightness(0.88) contrast(1.18) saturate(1.12)';
          ctx.drawImage(video, x, y, w, h);
          ctx.restore();
          const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.18, canvas.width / 2, canvas.height / 2, canvas.height * 0.82);
          vignette.addColorStop(0, 'rgba(0,0,0,0)');
          vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (p < 0.16) { ctx.fillStyle = `rgba(0,0,0,${1 - p / 0.16})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
          if (p > 0.84) { ctx.fillStyle = `rgba(0,0,0,${(p - 0.84) / 0.16})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
          if (p < 1) requestAnimationFrame(draw); else resolve();
        };
        requestAnimationFrame(draw);
      });
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
      if (!chunks.length) throw new Error('Free fill-in recorder produced no video data.');
      const output = new Blob(chunks, { type: chunks[0]?.type || mimeType || 'video/webm' });
      if (!output.size) throw new Error('Free fill-in produced an empty video.');
      if (fillInUrl) URL.revokeObjectURL(fillInUrl);
      setFillInUrl(URL.createObjectURL(output));
      setCurrentStage('STEP 7 — Zero-cost fill-in completed');
      setStatus(`✅ Zero-cost cinematic fill-in created — ${(output.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
      const details = makeErrorDetails(error, currentStage || 'Free fill-in error');
      console.error('[APP] FREE FILL-IN ERROR', details);
      setErrorDetails(details);
      setStatus(`❌ FILL-IN ERROR — ${details.message}`);
    } finally {
      setCreatingFillIn(false);
    }
  }

  async function buildAIEdit() {
    if (!file) return setStatus('Please choose a video first.');
    if (!plan?.cuts?.length) return setStatus('No AI edit plan is available yet. Analyse the video first.');
    setRendering(true);
    setRenderProgress(0);
    setErrorDetails(null);
    try {
      setCurrentStage('STEP 8 — Rendering AI-directed video');
      setStatus('🎬 Building your AI-directed cinematic edit...');
      const outputBlob = await renderProject([{ id: 'video-0', file, name: file.name, type: file.type || 'video/mp4', sourceUrl }], plan, (value) => {
        const p = Math.max(0, Math.min(100, Number(value) || 0));
        setRenderProgress(p);
        setStatus(`🎬 Rendering AI edit... ${p}%`);
      });
      if (!(outputBlob instanceof Blob) || outputBlob.size === 0) throw new Error('Renderer completed but produced an empty video file.');
      if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
      setRenderedVideoUrl(URL.createObjectURL(outputBlob));
      setRenderProgress(100);
      setCurrentStage('STEP 9 — AI edit completed');
      setStatus(`✅ AI edit completed successfully — ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      const details = makeErrorDetails(error, currentStage || 'AI render error');
      console.error('[APP] AI RENDER ERROR', details);
      setErrorDetails(details);
      setStatus(`❌ RENDER ERROR — ${details.message}`);
    } finally {
      setRendering(false);
    }
  }

  function clearVideo() {
    if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
    if (fillInUrl) URL.revokeObjectURL(fillInUrl);
    setFile(null);
    setSourceUrl('');
    setAnalysis(null);
    setPlan(null);
    setProductionPlan(null);
    setRenderedVideoUrl('');
    setFillInUrl('');
    setStatus('');
    setProgress(0);
    setRenderProgress(0);
    setErrorDetails(null);
    setCurrentStage('');
  }

  return <div className="app-container"><header className="app-header"><div><h1>BIKEZTAGRAM AI</h1><p>AI-powered motorcycle video editor</p></div></header><main>
    <section className="form-group"><label htmlFor="video-file">Test motorcycle footage</label><input id="video-file" type="file" accept="video/*" onChange={handleFileChange} disabled={loading || creatingFillIn || rendering}/>{file && <p className="status-text">{file.name}</p>}</section>
    <section className="form-group"><label htmlFor="analysis-prompt">Tell Gemini what to look for</label><textarea id="analysis-prompt" rows="6" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={loading || creatingFillIn || rendering}/></section>
    <div className="button-row">
      <button className="generate-btn" onClick={analyseActualVideo} disabled={loading || creatingFillIn || rendering || !file}>{loading ? '👁️ Analysing Video...' : '👁️ Analyse Actual Video'}</button>
      {productionPlan && !loading && !creatingFillIn && !rendering && <button className="generate-btn" onClick={createFreeFillIn}>✨ Create Free Fill-In</button>}
      {plan && !loading && !creatingFillIn && !rendering && <button className="generate-btn" onClick={buildAIEdit}>🎬 Build AI Edit</button>}
      {!loading && !creatingFillIn && !rendering && file && <button className="clear-btn" onClick={clearVideo}>Clear</button>}
    </div>
    {(loading || creatingFillIn || rendering) && <section className="status-panel" style={{marginTop:'15px'}}><p className="status-text">{status}</p><p style={{fontSize:'13px',opacity:0.8}}>{currentStage}</p>{loading && <div>Blob upload: {progress}%</div>}{rendering && <div>Render: {renderProgress}%</div>}{creatingFillIn && <div>Browser-only generation — no paid API.</div>}</section>}
    {!loading && !creatingFillIn && !rendering && status && !errorDetails && <section className="status-panel" style={{marginTop:'15px'}}><p className="status-text">{status}</p></section>}
    {errorDetails && <section className="status-panel" style={{marginTop:'20px',border:'2px solid #ff4d4d',padding:'15px',borderRadius:'8px'}}><h2>❌ FULL ERROR DETAILS</h2><button className="generate-btn" onClick={async () => { try { await navigator.clipboard.writeText(errorText); setStatus('✅ Error details copied.'); } catch {} }}>📋 Copy Error Details</button><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',fontSize:'12px'}}>{errorText}</pre></section>}
    {analysis && <section className="result-container" style={{marginTop:'20px'}}><h2>Gemini Video Analysis</h2><div className="status-panel"><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(analysis,null,2)}</pre></div></section>}
    {plan && <section className="result-container" style={{marginTop:'20px'}}><h2>🎬 AI Edit Plan</h2><div className="status-panel"><p>{describeAIEditPlan(plan)}</p><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(plan,null,2)}</pre></div></section>}
    {productionPlan && <section className="result-container" style={{marginTop:'20px'}}><h2>🎥 AI Production Blueprint</h2><div className="status-panel"><p>{productionPlan.title || 'AI Production Blueprint'}</p><p>{productionPlan.creativeDirection || ''}</p><p><strong>{productionPlan.scenes.filter((scene) => scene.sourceType === 'uploaded').length}</strong> real scenes • <strong>{productionPlan.scenes.filter((scene) => scene.sourceType === 'generated').length}</strong> generated fill-in scenes planned</p><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(productionPlan,null,2)}</pre></div></section>}
    {fillInUrl && <section className="result-container" style={{marginTop:'20px'}}><h2>✨ Free Cinematic Fill-In</h2><div className="status-panel"><video src={fillInUrl} controls playsInline autoPlay muted style={{width:'100%',maxWidth:'420px',display:'block',margin:'0 auto',borderRadius:'10px',background:'#000'}}/><p style={{marginTop:'12px'}}>Browser-generated from your supplied footage. No paid generation service is used.</p></div></section>}
    {renderedVideoUrl && <section className="result-container" style={{marginTop:'20px'}}><h2>🏍️ AI Cinematic Edit</h2><div className="status-panel"><video src={renderedVideoUrl} controls playsInline style={{width:'100%',maxWidth:'420px',display:'block',margin:'0 auto',borderRadius:'10px',background:'#000'}}/><p style={{marginTop:'12px'}}>Gemini selected the moments. The AI edit planner converted them into cuts, timing, speed, transitions and motion, and the browser renderer built the video.</p></div></section>}
  </main></div>;
}
