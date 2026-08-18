/* BIKEZTAGRAM AI — AI Director workflow. Working Blob/Gemini analysis pipeline is preserved. £0 generation path only. */
import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';
import { createAIEditPlan, describeAIEditPlan } from './aiEditPlanner.js';
import { requestTwoStageEditPlan, editPlanToDirectorBlueprint } from './twoStageDirector.js';
import { renderProject } from './renderer.js';
import { renderWorldScene } from './worldScene.js';
import { validateRenderedVideo, buildDirectorQAReport, downloadQAReport } from './qa.js';
import './styles.css';

const DEFAULT_PROMPT = 'Analyse this motorcycle footage for the strongest cinematic moments, camera movement, action, composition and best timestamps for an exciting social-media motorcycle video.';

export default function App() {
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
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
  const [qaReport, setQaReport] = useState(null);
  const errorText = errorDetails ? JSON.stringify(errorDetails, null, 2) : '';

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
    if (worldVideoUrl) URL.revokeObjectURL(worldVideoUrl);
    setFile(selected);
    setSourceUrl('');
    setAnalysis(null);
    setPlan(null);
    setProductionPlan(null);
    setRenderedVideoUrl('');
    setWorldVideoUrl('');
    setProgress(0);
    setRenderProgress(0);
    setErrorDetails(null);
    setCurrentStage('');
    setQaReport(null);
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
      browser: { online: navigator.onLine, userAgent: navigator.userAgent, url: window.location.href },
    };
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
    setWorldVideoUrl('');
    setSourceUrl('');
    setQaReport(null);

    try {
      setCurrentStage('STEP 1 — Preparing secure Blob upload');
      setStatus('Preparing secure Blob upload...');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const pathname = `videos/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const uploadController = new AbortController();
      const uploadStartedAt = performance.now();
      let lastProgressAt = uploadStartedAt;
      let lastProgressValue = 0;
      const uploadWatchdog = setTimeout(() => uploadController.abort(), 120000);
      const uploadHeartbeat = setInterval(() => {
        const elapsedSeconds = Math.round((performance.now() - uploadStartedAt) / 1000);
        const silentSeconds = Math.round((performance.now() - lastProgressAt) / 1000);
        console.info('[APP] Blob upload diagnostic heartbeat', { elapsedSeconds, progress: lastProgressValue, silentSeconds, online: navigator.onLine, fileSizeBytes: file.size });
        if (lastProgressValue === 0 && silentSeconds >= 15) setStatus(`Uploading video to Blob storage... waiting for transfer (${elapsedSeconds}s)`);
      }, 10000);

      let blob;
      try {
        console.info('[APP] Starting Blob client upload', { pathname, fileName: file.name, fileSizeBytes: file.size, mimeType: file.type || 'video/mp4', online: navigator.onLine });
        blob = await upload(pathname, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          multipart: false,
          clientPayload: JSON.stringify({ source: 'bikeztagram-ai', filename: file.name, mimeType: file.type || 'video/mp4', size: file.size }),
          abortSignal: uploadController.signal,
          onUploadProgress: (event) => {
            const value = Number(event?.percentage);
            if (!Number.isFinite(value)) return;
            const p = Math.max(0, Math.min(100, Math.round(value)));
            lastProgressAt = performance.now();
            lastProgressValue = p;
            setProgress(p);
            setStatus(`Uploading video to Blob storage... ${p}%`);
            console.info('[APP] Blob upload progress', { percentage: p });
          },
        });
      } catch (uploadError) {
        const elapsedSeconds = Math.round((performance.now() - uploadStartedAt) / 1000);
        const diagnosticError = new Error(`Blob client upload failed after ${elapsedSeconds}s. Last reported progress: ${lastProgressValue}%. Browser online: ${navigator.onLine}. Original error: ${uploadError?.message || String(uploadError)}`);
        diagnosticError.name = uploadError?.name || 'BlobUploadError';
        diagnosticError.stack = uploadError?.stack || diagnosticError.stack;
        throw diagnosticError;
      } finally {
        clearTimeout(uploadWatchdog);
        clearInterval(uploadHeartbeat);
      }

      if (!blob?.url || !blob?.pathname) throw new Error('Vercel Blob upload did not return a valid URL/pathname.');
      setSourceUrl(blob.url);
      setProgress(100);
      setCurrentStage('STEP 2 — Blob upload completed');
      setStatus('✅ Video successfully stored in Blob. Preparing Gemini analysis...');

      setCurrentStage('STEP 3 — Sending Blob video URL to /api/analyse');
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: blob.url, pathname: blob.pathname, filename: file.name, mimeType: file.type || 'video/mp4', prompt }),
      });
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch { throw new Error(`Analysis server returned invalid JSON: ${responseText.slice(0, 1000)}`); }
      if (!response.ok) throw new Error(data?.error || `Analysis server returned HTTP ${response.status}`);
      if (!data?.analysis) throw new Error('Gemini returned no analysis.');

      setAnalysis(data.analysis);
      setCurrentStage('STEP 5 — Stage 2 AI Creative Director');
      setStatus('Gemini analysed the actual video. Stage 2 is now directing the verified moments...');

      let generatedPlan;
      try {
        generatedPlan = await requestTwoStageEditPlan({ prompt, analysis: data.analysis, targetDuration: 15 });
        generatedPlan = { ...generatedPlan, source: 'gemini-two-stage-edit-plan' };
        setStatus(`✅ Stage 2 Creative Director selected the verified footage. ${describeAIEditPlan(generatedPlan)}`);
      } catch (stage2Error) {
        console.warn('[APP] Stage 2 unavailable; using local director as a degraded fallback.', stage2Error);
        generatedPlan = createAIEditPlan(data.analysis, { maxCuts: 8, targetDuration: 15, colorGrade: 'dark-cinematic', creativePrompt: prompt });
        if (!generatedPlan?.cuts?.length) throw stage2Error;
        generatedPlan = { ...generatedPlan, source: 'local-fallback-after-stage2-error' };
        setStatus(`⚠️ Stage 2 unavailable; local cinematic fallback prepared. ${describeAIEditPlan(generatedPlan)}`);
      }

      if (!generatedPlan?.cuts?.length) throw new Error('AI edit planner returned no usable cuts.');
      setPlan(generatedPlan);
      const blueprint = editPlanToDirectorBlueprint(generatedPlan, data.analysis, prompt, 15);
      setProductionPlan(blueprint);
      setCurrentStage('STEP 6 — AI Director plan ready');
      setStatus(`✅ AI Director plan ready — ${generatedPlan.cuts.length} verified cuts • ${blueprint.plannedDuration}s planned • real footage first.`);
      return blueprint;
    } catch (error) {
      const details = makeErrorDetails(error, currentStage || 'Unknown stage');
      console.error('[APP] ERROR', details);
      setErrorDetails(details);
      setStatus(`❌ ERROR — ${details.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function createFreeWorldScene() {
    if (!file || !file.type.startsWith('video/')) return setStatus('Choose a video first.');
    if (!sourceUrl) return setStatus('Please analyse the video first so the verified Blob source is available.');
    setCreatingWorld(true);
    setRenderProgress(0);
    setErrorDetails(null);
    setCurrentStage('STEP 7 — Creating zero-cost AI world scene');
    setStatus('✨ Building an original cinematic world around your motorcycle — entirely in the browser...');
    try {
      const outputBlob = await renderWorldScene({
        file,
        sourceUrl,
        prompt,
        duration: 6,
        onProgress: (value) => {
          const p = Math.max(0, Math.min(100, Number(value) || 0));
          setRenderProgress(p);
          setStatus(`✨ Building AI world scene... ${p}%`);
        },
      });
      if (!(outputBlob instanceof Blob) || outputBlob.size === 0) throw new Error('World scene renderer produced an empty video.');
      if (worldVideoUrl) URL.revokeObjectURL(worldVideoUrl);
      setWorldVideoUrl(URL.createObjectURL(outputBlob));
      setRenderProgress(100);
      setCurrentStage('STEP 8 — Zero-cost AI world scene completed');
      setStatus(`✅ Original procedural world scene created — ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB.`);
    } catch (error) {
      const details = makeErrorDetails(error, 'STEP 7 — Creating zero-cost AI world scene');
      console.error('[APP] WORLD SCENE ERROR', details);
      setErrorDetails(details);
      setStatus(`❌ WORLD SCENE ERROR — ${details.message}`);
    } finally {
      setCreatingWorld(false);
    }
  }

  function productionPlanToRenderPlan(sourcePlan) {
    if (!sourcePlan?.scenes?.length) return null;
    const cuts = sourcePlan.scenes.map((scene, index) => {
      const uploaded = scene.sourceType === 'uploaded';
      const motionStyle = scene.motionStyle || (index % 2 ? 'pan-right' : 'slow-push');
      const speed = Math.max(0.5, Math.min(1.5, Number(scene.speed) || 1));
      return {
        mediaIndex: 0,
        mediaId: 'video-0',
        startTime: uploaded ? Math.max(0, Number(scene.startTime) || 0) : 0,
        duration: Math.max(0.5, Number(scene.duration) || 1.5),
        purpose: scene.purpose || 'real-footage',
        sourceType: 'uploaded',
        generated: false,
        generationPrompt: '',
        transition: scene.transitionIn || (index === 0 ? 'fade-in' : 'hard-cut'),
        motionStyle,
        motionIntensity: Math.max(0, Math.min(1.5, Number(scene.motionIntensity) || 0.65)),
        speed,
        speedEnd: Math.max(0.5, Math.min(1.5, Number(scene.speedEnd ?? speed) || speed)),
        colorGrade: scene.colorGrade || (sourcePlan.style?.dark ? 'dark-cinematic' : 'cinematic'),
        stabilization: true,
        text: scene.text || '',
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
      source: sourcePlan.directorSource || 'bikeztagram-two-stage-director',
      mode: 'real-footage-first',
    };
  }

  async function buildAIEdit() {
    if (!file) { setStatus('Please choose a video first.'); return null; }
    if (!plan?.cuts?.length) { setStatus('No AI edit plan is available yet. Analyse the video first.'); return null; }
    setRendering(true);
    setRenderProgress(0);
    setErrorDetails(null);
    try {
      setCurrentStage('STEP 9 — Rendering AI-directed video');
      setStatus('🎬 Rendering AI Director edit — real footage first...');
      const renderPlan = productionPlanToRenderPlan(productionPlan) || plan;
      if (!renderPlan?.cuts?.length) throw new Error('No executable render cuts were produced.');
      const outputBlob = await renderProject([{ id: 'video-0', file, name: file.name, type: file.type || 'video/mp4', sourceUrl }], renderPlan, (value) => {
        const p = Math.max(0, Math.min(100, Number(value) || 0));
        setRenderProgress(p);
        setStatus(`🎬 Rendering AI edit... ${p}%`);
      });
      if (!(outputBlob instanceof Blob) || outputBlob.size === 0) throw new Error('Renderer completed but produced an empty video file.');
      if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
      setRenderedVideoUrl(URL.createObjectURL(outputBlob));
      setRenderProgress(100);
      setCurrentStage('STEP 10 — AI edit completed');
      setStatus(`✅ AI Director edit rendered — ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`);
      return { outputBlob, renderPlan };
    } catch (error) {
      const details = makeErrorDetails(error, currentStage || 'AI render error');
      console.error('[APP] AI RENDER ERROR', details);
      setErrorDetails(details);
      setStatus(`❌ RENDER ERROR — ${details.message}`);
      return null;
    } finally {
      setRendering(false);
    }
  }

  async function runFullAITest() {
    if (!file) return setStatus('Please choose a video first.');
    if (!productionPlan || !plan?.cuts?.length) return setStatus('Analyse the video first so the AI Director has a verified plan.');
    setErrorDetails(null);
    setQaReport(null);
    setCurrentStage('STEP 11 — Automatic browser QA');
    setStatus('🧪 Rendering complete. Running automatic playback and output QA...');
    try {
      const result = await buildAIEdit();
      if (!result?.outputBlob) throw new Error('Full test could not produce a rendered video.');
      const renderQA = await validateRenderedVideo(result.outputBlob, Number(productionPlan.targetDuration) || 15);
      const report = buildDirectorQAReport({ file, analysis, productionPlan, renderPlan: result.renderPlan, renderQA });
      setQaReport(report);
      setCurrentStage('STEP 12 — Automatic browser QA passed');
      setStatus(`✅ FULL AI TEST PASSED — browser decoded and played the rendered video (${renderQA.durationSeconds}s, ${renderQA.blobMB} MB).`);
      return report;
    } catch (error) {
      const details = makeErrorDetails(error, 'STEP 11 — Automatic browser QA');
      console.error('[APP] FULL AI TEST ERROR', details);
      setErrorDetails(details);
      setStatus(`❌ FULL AI TEST FAILED — ${details.message}`);
      return null;
    }
  }

  async function downloadRenderedVideo() {
    if (!renderedVideoUrl) return setStatus('No rendered video is available yet.');
    try {
      const response = await fetch(renderedVideoUrl);
      if (!response.ok) throw new Error(`Could not read rendered video (${response.status}).`);
      const blob = await response.blob();
      if (!blob.size) throw new Error('Rendered video download data was empty.');
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const safeBase = (file?.name || 'bikeztagram-ai').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${safeBase}-bikeztagram-ai.${extension}`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      setStatus(`✅ Video download started — ${safeBase}-bikeztagram-ai.${extension}`);
    } catch (error) {
      console.warn('[APP] Direct video download failed; opening rendered video instead.', error);
      try {
        const anchor = document.createElement('a');
        anchor.href = renderedVideoUrl;
        anchor.download = 'bikeztagram-ai-video.webm';
        anchor.target = '_blank';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setStatus('✅ Rendered video opened for saving.');
      } catch {
        setStatus(`❌ DOWNLOAD ERROR — ${error?.message || String(error)}`);
      }
    }
  }

  function clearVideo() {
    if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
    if (worldVideoUrl) URL.revokeObjectURL(worldVideoUrl);
    setFile(null);
    setSourceUrl('');
    setAnalysis(null);
    setPlan(null);
    setProductionPlan(null);
    setRenderedVideoUrl('');
    setWorldVideoUrl('');
    setStatus('');
    setProgress(0);
    setRenderProgress(0);
    setErrorDetails(null);
    setCurrentStage('');
    setQaReport(null);
  }

  const busy = loading || creatingWorld || rendering;
  return <div className="app-container"><header className="app-header"><div><h1>BIKEZTAGRAM AI</h1><p>AI-powered motorcycle video editor</p></div></header><main>
    <section className="form-group"><label htmlFor="video-file">Your source video</label><input id="video-file" type="file" accept="video/*" onChange={handleFileChange} disabled={busy}/>{file && <p className="status-text">{file.name}</p>}</section>
    <section className="form-group"><label htmlFor="analysis-prompt">Tell Bikeztagram what to create</label><textarea id="analysis-prompt" rows="7" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={busy} placeholder="Example: Make a 15-second cinematic Ninja reel using my real footage. Keep the real scenery, choose the strongest shots, vary the pacing, add subtle camera movement and finish on the best hero shot."/></section>
    <div className="button-row"><button className="generate-btn" onClick={analyseActualVideo} disabled={busy || !file}>{loading ? '👁️ Analysing Video...' : '👁️ Analyse Actual Video'}</button>{productionPlan && !busy && <button className="generate-btn" onClick={createFreeWorldScene}>✨ Create Free AI World Scene</button>}{plan && !busy && <button className="generate-btn" onClick={buildAIEdit}>🎬 Build AI Edit</button>}{productionPlan && plan && !busy && <button className="generate-btn" onClick={runFullAITest}>🧪 Run Full AI Test</button>}{!busy && file && <button className="clear-btn" onClick={clearVideo}>Clear</button>}</div>
    {busy && <section className="status-panel" style={{marginTop:'15px'}}><p className="status-text">{status}</p><p style={{fontSize:'13px',opacity:0.8}}>{currentStage}</p>{loading && <div>Blob upload: {progress}%</div>}{(rendering || creatingWorld) && <div>Render: {renderProgress}%</div>}{creatingWorld && <div>Browser-only generation — no paid video API.</div>}</section>}
    {!busy && status && !errorDetails && <section className="status-panel" style={{marginTop:'15px'}}><p className="status-text">{status}</p></section>}
    {qaReport && <section className="result-container" style={{marginTop:'20px'}}><h2>🧪 Automatic AI Director QA</h2><div className="status-panel"><p><strong>VERDICT: {qaReport.verdict}</strong></p><p>{qaReport.output?.verdict || ''}</p><p>{qaReport.director?.realSceneCount || 0} real scenes • {qaReport.director?.generatedSceneCount || 0} generated scenes • {qaReport.renderer?.cutCount || 0} rendered cuts</p><p>Output: {qaReport.output?.durationSeconds || 0}s • {qaReport.output?.blobMB || 0} MB • {qaReport.output?.width || 0}×{qaReport.output?.height || 0}</p><p>Playback probe: {qaReport.output?.playbackProbeSeconds || 0}s successfully decoded and advanced.</p><button className="generate-btn" onClick={() => downloadQAReport(qaReport)}>📋 Download QA Report</button></div></section>}
    {errorDetails && <section className="status-panel" style={{marginTop:'20px',border:'2px solid #ff4d4d',padding:'15px',borderRadius:'8px'}}><h2>❌ FULL ERROR DETAILS</h2><button className="generate-btn" onClick={async () => { try { await navigator.clipboard.writeText(errorText); setStatus('✅ Error details copied.'); } catch {} }}>📋 Copy Error Details</button><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',fontSize:'12px'}}>{errorText}</pre></section>}
    {analysis && <section className="result-container" style={{marginTop:'20px'}}><h2>Gemini Video Analysis</h2><div className="status-panel"><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(analysis,null,2)}</pre></div></section>}
    {plan && <section className="result-container" style={{marginTop:'20px'}}><h2>🎬 AI Edit Plan</h2><div className="status-panel"><p>{describeAIEditPlan(plan)}</p><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(plan,null,2)}</pre></div></section>}
    {productionPlan && <section className="result-container" style={{marginTop:'20px'}}><h2>🎥 AI Creative Director Blueprint</h2><div className="status-panel"><p>{productionPlan.title || 'AI Creative Director Blueprint'}</p><p>{productionPlan.creativeDirection || ''}</p><p><strong>{productionPlan.scenes.filter((scene) => scene.sourceType === 'uploaded').length}</strong> real scenes • <strong>{productionPlan.scenes.filter((scene) => scene.sourceType === 'generated').length}</strong> generated scenes</p><p>Default render mode: <strong>REAL FOOTAGE FIRST</strong>. Stage 2 now uses the verified edit-plan contract, so this execution path does not make a second Creative Director request.</p><pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',textAlign:'left',margin:0}}>{JSON.stringify(productionPlan,null,2)}</pre></div></section>}
    {worldVideoUrl && <section className="result-container" style={{marginTop:'20px'}}><h2>🌎 Free AI World Scene</h2><div className="status-panel"><video src={worldVideoUrl} controls playsInline autoPlay muted style={{width:'100%',maxWidth:'420px',display:'block',margin:'0 auto',borderRadius:'10px',background:'#000'}}/><p style={{marginTop:'12px'}}>Optional original procedural environment. This is not used automatically for normal real-footage edits.</p></div></section>}
    {renderedVideoUrl && <section className="result-container" style={{marginTop:'20px'}}><h2>🏍️ AI Cinematic Edit</h2><div className="status-panel"><video src={renderedVideoUrl} controls playsInline style={{width:'100%',maxWidth:'420px',display:'block',margin:'0 auto',borderRadius:'10px',background:'#000'}}/><div className="button-row" style={{marginTop:'12px'}}><button className="generate-btn" onClick={downloadRenderedVideo}>⬇️ Download AI Video</button></div><p style={{marginTop:'12px'}}>AI analysed the real footage, Stage 2 directed the verified moments, and the browser renderer executed the plan. The automatic QA test verifies that the resulting video actually decodes and plays.</p></div></section>}
  </main></div>;
}
