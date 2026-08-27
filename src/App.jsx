/* BIKEZTAGRAM AI — universal filmmaker UI with real project persistence & recovery (Batch 98). Blob/Gemini/render infrastructure remains protected. */
import React, { useState, useEffect } from 'react';
import { createAIEditPlan, describeAIEditPlan } from './aiEditPlanner.js';
import { renderInspectImprove } from './renderQualityLoop.js';
import { renderWorldScene } from './worldScene.js';
import { generateOriginalMusic } from './musicGenerator.js';
import { downloadSocialFilm, shareSocialFilm, getSocialExportInfo } from './socialExport.js';
import { applySpeechCaptionsToPlan, describeCaptionPlan } from './captionPlanner.js';
import { downloadRhythmReplacementMap } from './musicReplacementGuide.js';
import { saveProjectState, loadProjectState, clearProjectState } from './projectPersistence.js';
import './styles.css';

const DEFAULT_PROMPT = 'Create the strongest cinematic social-media film from this media. Prioritise authentic footage, clear story, rhythm, composition, premium visual direction and a strong ending.';
const safeName = (name) => String(name || 'media').replace(/[^a-zA-Z0-9._-]/g, '_');

function putWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Direct Blob upload failed at the network layer.'));
    xhr.ontimeout = () => reject(new Error('Direct Blob upload timed out.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Direct Blob upload returned HTTP ${xhr.status}.`));
    };
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(file);
  });
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [sources, setSources] = useState([]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [analysis, setAnalysis] = useState(null);
  const [plan, setPlan] = useState(null);
  const [productionPlan, setProductionPlan] = useState(null);
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState('');
  const [qa, setQa] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState(null);
  const [worldUrl, setWorldUrl] = useState('');
  const [soundtrack, setSoundtrack] = useState(null);
  const [exportInfo, setExportInfo] = useState(null);
  const [autoCaptions, setAutoCaptions] = useState(true);
  const [captionResult, setCaptionResult] = useState(null);
  const [persistenceNotice, setPersistenceNotice] = useState(null);

  const busy = loading || rendering;
  const isSingle = files.length === 1;
  const isVideo = isSingle && files[0]?.type?.startsWith('video/');

  // On mount, check if there is a saved project state to recover
  useEffect(() => {
    const res = loadProjectState();
    if (res.success && res.state) {
      const st = res.state;
      if (st.prompt) setPrompt(st.prompt);
      if (st.sources?.length) setSources(st.sources);
      if (st.analysis) setAnalysis(st.analysis);
      if (st.plan) setPlan(st.plan);
      if (st.productionPlan) setProductionPlan(st.productionPlan);
      if (st.soundtrack) setSoundtrack(st.soundtrack);
      if (typeof st.autoCaptions === 'boolean') setAutoCaptions(st.autoCaptions);
      if (st.captionResult) setCaptionResult(st.captionResult);
      if (st.exportInfo) setExportInfo(st.exportInfo);

      const notice = res.meta?.missingMedia
        ? '⚠️ Restored project metadata, but original local media files require re-selection for rendering.'
        : `✅ Restored saved project session (${st.sources?.length || 0} source asset${st.sources?.length === 1 ? '' : 's'}, last updated ${res.meta?.updatedAt ? new Date(res.meta.updatedAt).toLocaleTimeString() : 'recently'}).`;
      setPersistenceNotice(notice);
      setStatus(notice);
    }
  }, []);

  // Auto-save project state whenever core editable metadata changes
  useEffect(() => {
    if (sources.length > 0 || analysis || plan) {
      saveProjectState({
        prompt,
        sources,
        analysis,
        plan,
        productionPlan,
        soundtrack,
        autoCaptions,
        captionResult,
        exportInfo
      });
    }
  }, [prompt, sources, analysis, plan, productionPlan, soundtrack, autoCaptions, captionResult, exportInfo]);

  function handleSaveProjectNow() {
    const res = saveProjectState({
      prompt,
      sources,
      analysis,
      plan,
      productionPlan,
      soundtrack,
      autoCaptions,
      captionResult,
      exportInfo
    });
    if (res.success) {
      setPersistenceNotice(`💾 Project successfully saved at ${new Date(res.updatedAt).toLocaleTimeString()}.`);
      setStatus('💾 Project successfully saved to local storage.');
    } else {
      setStatus(`❌ Failed to save project: ${res.error}`);
    }
  }

  function handleClearSavedProject() {
    clearProjectState();
    setPersistenceNotice('🗑️ Saved project session cleared.');
    setStatus('🗑️ Saved project session cleared from local storage.');
  }

  function reset() {
    if (renderedUrl) URL.revokeObjectURL(renderedUrl);
    if (worldUrl) URL.revokeObjectURL(worldUrl);
    setFiles([]);
    setSources([]);
    setAnalysis(null);
    setPlan(null);
    setProductionPlan(null);
    setRenderedUrl('');
    setWorldUrl('');
    setQa(null);
    setAttempts(0);
    setError(null);
    setStatus('');
    setStage('');
    setUploadProgress(0);
    setRenderProgress(0);
    setSoundtrack(null);
    setExportInfo(null);
    setCaptionResult(null);
    clearProjectState();
  }

  function choose(e) {
    const selected = Array.from(e.target.files || []).slice(0, 12);
    if (renderedUrl) URL.revokeObjectURL(renderedUrl);
    setFiles(selected);
    setSources([]);
    setAnalysis(null);
    setPlan(null);
    setProductionPlan(null);
    setRenderedUrl('');
    setWorldUrl('');
    setQa(null);
    setAttempts(0);
    setError(null);
    setSoundtrack(null);
    setExportInfo(null);
    setCaptionResult(null);
    setStatus(selected.length ? `Selected ${selected.length} media file${selected.length === 1 ? '' : 's'}.` : '');
    setStage('');
  }

  function details(err) {
    return {
      time: new Date().toISOString(),
      stage,
      message: err?.message || String(err),
      name: err?.name || 'Error',
      stack: err?.stack || '',
      files: files.map(f => ({ name: f.name, type: f.type, sizeBytes: f.size })),
      online: navigator.onLine
    };
  }

  async function uploadOne(file, index, total) {
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    setStatus(`Uploading ${file.name}...`);
    const r = await fetch('/api/blob-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, mimeType: file.type, size: file.size, mediaType })
    });
    const t = await r.text();
    let data;
    try {
      data = JSON.parse(t);
    } catch {
      throw new Error(`Blob signing returned invalid JSON: ${t.slice(0, 300)}`);
    }
    if (!r.ok || !data?.presignedUrl) throw new Error(data?.error || `Blob signing HTTP ${r.status}`);
    await putWithProgress(data.presignedUrl, file, p => setUploadProgress(Math.round(((index + p / 100) / total) * 100)));
    if (!data.url) throw new Error(`Blob upload completed without a public URL for ${file.name}.`);
    setUploadProgress(Math.round(((index + 1) / total) * 100));
    return { id: `source-${index}`, file: undefined, name: file.name, type: file.type, sourceUrl: data.url, url: data.url, pathname: data.pathname, mimeType: file.type };
  }

  async function analyseSpeech(item) {
    if (!autoCaptions || !item?.type?.startsWith('video/')) return null;
    setStage('STEP 3A — Gemini speech/caption analysis');
    setStatus('📝 Checking the actual video for spoken dialogue and time-coded captions...');
    try {
      const r = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: item.url, filename: item.name, mimeType: item.mimeType })
      });
      const t = await r.text();
      let data;
      try {
        data = JSON.parse(t);
      } catch {
        throw new Error(`Caption analysis returned invalid JSON: ${t.slice(0, 300)}`);
      }
      if (!r.ok) throw new Error(data?.error || `Caption analysis HTTP ${r.status}`);
      return data;
    } catch (err) {
      console.warn('[APP] caption analysis fallback', err);
      setStatus('📝 Caption analysis unavailable; continuing without captions.');
      return null;
    }
  }

  async function analyse() {
    if (!files.length && !sources.length) return setStatus('Choose one or more images/videos first.');
    if (files.length > 0 && files.some(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'))) {
      return setStatus('Only images and videos are supported.');
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setPlan(null);
    setProductionPlan(null);
    setRenderedUrl('');
    setQa(null);
    setAttempts(0);
    setUploadProgress(0);
    setSoundtrack(null);
    setExportInfo(null);
    setCaptionResult(null);

    try {
      let uploaded = sources;
      if (files.length > 0) {
        setStage('STEP 1 — Uploading source library to Vercel Blob');
        setStatus(`Uploading ${files.length} source${files.length === 1 ? '' : 's'}...`);
        uploaded = [];
        for (let i = 0; i < files.length; i++) {
          uploaded.push(await uploadOne(files[i], i, files.length));
        }
        setSources(uploaded);
        setUploadProgress(100);
      }

      setStage('STEP 2 — Gemini analysing the actual source library');
      let data;
      if (uploaded.length > 1) {
        const r = await fetch('/api/analyse-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            targetDuration: 15,
            items: uploaded.map(x => ({ url: x.url, filename: x.name, mimeType: x.mimeType, mediaType: x.type.startsWith('image/') ? 'image' : 'video' }))
          })
        });
        const t = await r.text();
        try {
          data = JSON.parse(t);
        } catch {
          throw new Error(`Mixed-media analysis returned invalid JSON: ${t.slice(0, 500)}`);
        }
        if (!r.ok) throw new Error(data?.error || `Mixed-media analysis HTTP ${r.status}`);
        if (!data?.analysis || !data?.aiEditPlan?.cuts?.length) throw new Error('Gemini returned no valid mixed-media director plan.');

        let mixedPlan = data.aiEditPlan;
        const videoItems = uploaded.filter(x => x.type.startsWith('video/'));
        for (const item of videoItems) {
          const captionData = await analyseSpeech(item);
          if (captionData?.cues?.length) {
            const applied = applySpeechCaptionsToPlan(mixedPlan, captionData.cues, { minimumConfidence: 0.55, sourceIndex: uploaded.indexOf(item) });
            mixedPlan = applied.plan;
            setCaptionResult(prev => ({ ...prev, ...captionData, captionCount: (prev?.captionCount || 0) + applied.captionCount, appliedCount: (prev?.appliedCount || 0) + applied.appliedCount }));
          }
        }
        setAnalysis(data.analysis);
        setPlan(mixedPlan);
        setProductionPlan({
          title: mixedPlan.title,
          creativeDirection: data.analysis.librarySummary,
          scenes: mixedPlan.cuts.map(c => ({
            mediaIndex: c.sourceIndex,
            sourceType: 'uploaded',
            startTime: c.startTime,
            duration: c.duration,
            purpose: c.purpose,
            transitionIn: c.transition,
            motionStyle: c.motionStyle
          }))
        });
        setStatus(`✅ Gemini directed ${uploaded.length} sources as one film: ${mixedPlan.cuts.length} selected shots.`);
      } else {
        const item = uploaded[0];
        const image = item.type.startsWith('image/');
        const endpoint = image ? '/api/analyse-image' : '/api/analyse';
        const payload = image
          ? { imageUrl: item.url, pathname: item.pathname, filename: item.name, mimeType: item.mimeType, prompt }
          : { videoUrl: item.url, pathname: item.pathname, filename: item.name, mimeType: item.mimeType, prompt };

        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const t = await r.text();
        try {
          data = JSON.parse(t);
        } catch {
          throw new Error(`Analysis returned invalid JSON: ${t.slice(0, 500)}`);
        }
        if (!r.ok) throw new Error(data?.error || `Analysis HTTP ${r.status}`);
        if (!data?.analysis) throw new Error('Gemini returned no media analysis.');

        setAnalysis(data.analysis);
        setStage('STEP 3 — AI Director + production blueprint');
        let localPlan = createAIEditPlan(data.analysis, { maxCuts: 8, targetDuration: 15, colorGrade: 'dark-cinematic', creativePrompt: prompt });
        if (!localPlan?.cuts?.length) throw new Error('AI Director returned no usable cuts.');

        const captionData = await analyseSpeech(item);
        if (captionData?.cues?.length) {
          const applied = applySpeechCaptionsToPlan(localPlan, captionData.cues, { minimumConfidence: 0.55 });
          localPlan = applied.plan;
          setCaptionResult({ ...applied, ...captionData });
          setStatus(`✅ Gemini analysed the actual ${image ? 'image' : 'video'}. ${describeAIEditPlan(localPlan)} • ${describeCaptionPlan(applied)}`);
        } else {
          setCaptionResult(captionData ? { ...captionData, captionCount: 0, appliedCount: 0 } : null);
          setStatus(`✅ Gemini analysed the actual ${image ? 'image' : 'video'}. ${describeAIEditPlan(localPlan)}`);
        }
        setPlan(localPlan);

        try {
          const pr = await fetch('/api/production-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, analysis: data.analysis, targetDuration: 15 })
          });
          const pd = await pr.json();
          if (pr.ok && pd?.productionPlan?.scenes?.length) {
            setProductionPlan(pd.productionPlan);
          }
        } catch (e) {
          console.warn('[APP] production blueprint fallback', e);
        }
      }
    } catch (err) {
      const d = details(err);
      console.error('[APP]', d);
      setError(d);
      setStatus(`❌ ERROR — ${d.message}`);
    } finally {
      setLoading(false);
    }
  }

  function makeRenderPlan() {
    if (!plan?.cuts?.length) return null;
    const blueprint = productionPlan?.scenes?.length ? productionPlan : null;
    const cuts = (blueprint ? blueprint.scenes : plan.cuts).map((c, i) => {
      const sourceIndex = Number.isInteger(Number(c.sourceIndex ?? c.mediaIndex)) ? Number(c.sourceIndex ?? c.mediaIndex) : 0;
      const source = sources[sourceIndex] || sources[0];
      const generated = Boolean(c.generated || c.sourceType === 'generated' || c.sourceType === 'procedural' || c.generationPrompt);
      return {
        ...c,
        mediaIndex: sourceIndex,
        mediaId: generated ? undefined : (source?.id || `source-${sourceIndex}`),
        sourceType: generated ? 'generated' : 'uploaded',
        generated,
        generationPrompt: c.generationPrompt || '',
        colorGrade: c.colorGrade || blueprint?.colorGrade || plan.colorGrade || 'dark-cinematic',
        motionIntensity: Number(c.motionIntensity) || 1,
        stabilization: true,
        speedEnd: c.speedEnd ?? c.speed ?? 1,
        startTime: generated ? undefined : Number(c.startTime ?? c.startTime === 0 ? c.startTime : 0),
        duration: Number(c.duration) || 2,
        transition: c.transitionIn || c.transition || ((i === 0) ? 'fade-in' : 'hard-cut')
      };
    });
    return {
      title: blueprint?.title || plan.title || 'Universal AI Film',
      style: blueprint?.style || plan.style || 'cinematic',
      creativePrompt: prompt,
      colorGrade: blueprint?.colorGrade || plan.colorGrade || 'dark-cinematic',
      cuts,
      targetDuration: Number(blueprint?.targetDuration || plan.targetDuration) || 15,
      speechCaptions: plan.speechCaptions || [],
      captioning: plan.captioning || { enabled: false }
    };
  }

  async function render() {
    if (!plan?.cuts?.length || !sources.length) return setStatus('Analyse the media first.');
    setRendering(true);
    setError(null);
    setRenderProgress(0);
    setQa(null);
    setAttempts(0);
    setExportInfo(null);

    try {
      setStage('STEP 4A — Creating original soundtrack');
      setStatus('🎵 Creating an original soundtrack and analysing its beat grid...');
      let musicResult = null;
      try {
        musicResult = await generateOriginalMusic({ prompt, duration: 15 });
        if (musicResult?.soundtrack) {
          setSoundtrack(musicResult.soundtrack);
          if (musicResult.soundtrack.audioAvailable) {
            setStatus(`🎵 Original soundtrack ready — ${musicResult.soundtrack.bpm || 'target'} BPM. Preparing cinematic render...`);
          } else {
            setStatus('🎵 Music plan ready; live audio generation unavailable, continuing with visual render.');
          }
        }
      } catch (musicError) {
        console.warn('[APP] soundtrack generation fallback', musicError);
        setStatus('🎵 Soundtrack generation unavailable; continuing with visual render.');
      }

      setStage('STEP 4B — Render → inspect → improve');
      const renderPlan = makeRenderPlan();
      if (musicResult?.soundtrack?.audioAvailable) renderPlan.music = { ...musicResult.soundtrack };

      const result = await renderInspectImprove({
        mediaItems: sources,
        plan: renderPlan,
        expectedDuration: renderPlan.targetDuration,
        maxAttempts: 2,
        onProgress: (e) => {
          if (e.stage === 'render') {
            setRenderProgress(Math.round(Number(e.value) || 0));
            setStatus(`🎬 Rendering attempt ${e.attempt}... ${Math.round(Number(e.value) || 0)}%`);
          }
          if (e.stage === 'qa') {
            setQa(e.qa);
            setAttempts(e.attempt);
            setStatus(`🔎 Automatic render QA — ${e.qa?.verdict || 'CHECKING'}`);
          }
          if (e.stage === 'revise') {
            setStatus(`🛠️ Improving render: ${(e.reasons || []).join(', ') || 'quality revision'}`);
          }
        }
      });

      if (!(result?.output instanceof Blob) || !result.output.size) throw new Error('Renderer produced no usable video.');
      if (renderedUrl) URL.revokeObjectURL(renderedUrl);
      setRenderedUrl(URL.createObjectURL(result.output));
      setQa(result.qa);
      setAttempts(result.attempts?.length || 1);
      setExportInfo(getSocialExportInfo(result.output, 'portrait'));
      setRenderProgress(100);
      setStage('STEP 5 — Finished film + automatic QA checkpoint');
      setStatus(`✅ Finished AI film created, soundtrack processed and QA checked — ${result.attempts?.length || 1} render attempt(s).`);
    } catch (err) {
      const d = details(err);
      console.error('[APP RENDER]', d);
      setError(d);
      setStatus(`❌ RENDER ERROR — ${d.message}`);
    } finally {
      setRendering(false);
    }
  }

  async function exportFilm() {
    try {
      if (!renderedUrl) return setStatus('Build the film first.');
      const blob = await fetch(renderedUrl).then(r => r.blob());
      const info = downloadSocialFilm(blob, { presetId: 'portrait', name: plan?.title || 'bikeztagram-ai-film' });
      setExportInfo(info);
      setStatus(`⬇️ Film exported as ${info.formatLabel} — ${info.width}×${info.height}.`);
    } catch (err) {
      setStatus(`❌ EXPORT ERROR — ${err.message}`);
    }
  }

  async function shareFilm() {
    try {
      if (!renderedUrl) return setStatus('Build the film first.');
      const blob = await fetch(renderedUrl).then(r => r.blob());
      const info = await shareSocialFilm(blob, { presetId: 'portrait', name: plan?.title || 'bikeztagram-ai-film' });
      setExportInfo(info);
      setStatus(`📤 Film shared — ${info.formatLabel} ${info.width}×${info.height}.`);
    } catch (err) {
      setStatus(`❌ SHARE — ${err.message}`);
    }
  }

  async function world() {
    if (!isVideo || !sources[0]) return setStatus('World bridge requires one video source.');
    setRendering(true);
    setError(null);
    try {
      setStage('STEP 4A — Original world bridge');
      const blob = await renderWorldScene({ file: files[0], sourceUrl: sources[0].url, prompt, duration: 6, onProgress: p => setRenderProgress(Number(p) || 0) });
      if (!(blob instanceof Blob) || !blob.size) throw new Error('World bridge returned an empty video.');
      if (worldUrl) URL.revokeObjectURL(worldUrl);
      setWorldUrl(URL.createObjectURL(blob));
      setStatus('✅ Original AI world scene created.');
    } catch (err) {
      const d = details(err);
      setError(d);
      setStatus(`❌ WORLD ERROR — ${d.message}`);
    } finally {
      setRendering(false);
    }
  }

  function exportRhythmMap() {
    try {
      const payload = downloadRhythmReplacementMap(plan, soundtrack, plan?.title || 'bikeztagram-ai-rhythm-map');
      setStatus(`🎵 Rhythm replacement map exported — ${payload.editCuts.length} timed edit sections.`);
    } catch (err) {
      setStatus(`❌ RHYTHM MAP ERROR — ${err.message}`);
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <div>
            <h1>BIKEZTAGRAM <span>AI</span></h1>
            <p>YOUR AI FILM DIRECTOR</p>
          </div>
          <div className="live-pill"><i /> ENGINE READY</div>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="secondary-btn" onClick={handleSaveProjectNow} title="Save current project metadata" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>💾 Save Project</button>
          <button className="secondary-btn" onClick={handleClearSavedProject} title="Clear saved project from storage" style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.3)', borderRadius: '6px', color: '#ff8888', cursor: 'pointer' }}>🗑️ Reset Session</button>
        </div>
      </header>

      <main>
        <section className="hero-panel">
          <div>
            <div className="eyebrow">UNIVERSAL AI FILMMAKER + PROJECT PERSISTENCE</div>
            <h2>Turn your media into a film.</h2>
            <p>Upload photos, videos or a mixture of both. Tell Bikeztagram what you want — the AI directs the story, rhythm, music, movement and final cut. Projects automatically persist and restore seamlessly.</p>
            {persistenceNotice && (
              <div className="persistence-banner" style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(50,200,100,0.15)', border: '1px solid rgba(50,200,100,0.3)', borderRadius: '6px', fontSize: '13px', color: '#aaffcc' }}>
                {persistenceNotice}
              </div>
            )}
          </div>
          <div className="hero-badge">
            <strong>9:16</strong>
            <span>Social-ready<br />cinematic output</span>
          </div>
        </section>

        <section className="workspace-grid">
          <section className="glass-card source-card">
            <div className="section-title">
              <span>01</span>
              <h3>Your media</h3>
              <em>UP TO 12</em>
            </div>
            <label className="dropzone" htmlFor="media-file">
              <div className="drop-icon">＋</div>
              <strong>Drop your story here</strong>
              <span>Photos + videos • mixed media supported</span>
              <b>Choose media</b>
            </label>
            <input id="media-file" className="hidden-input" type="file" accept="video/*,image/*" multiple onChange={choose} disabled={busy} />
            {files.length > 0 && (
              <div className="media-strip">
                {files.map((f, i) => (
                  <div className="media-thumb" key={`${f.name}-${i}`}>
                    {f.type.startsWith('image/') ? <img src={URL.createObjectURL(f)} alt="" /> : <video src={URL.createObjectURL(f)} muted playsInline />}
                    <span>{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
            {files.length === 0 && sources.length > 0 && (
              <div className="restored-sources-info" style={{ marginTop: '10px', fontSize: '12px', color: '#88ddff' }}>
                📂 Restored {sources.length} source reference{sources.length === 1 ? '' : 's'}. To render or re-analyse, please re-select your local media files above if required.
              </div>
            )}
          </section>

          <section className="glass-card director-card">
            <div className="section-title">
              <span>02</span>
              <h3>Direct your film</h3>
              <em>AI DIRECTOR</em>
            </div>
            <div className="director-bubble">
              <div className="ai-avatar">✦</div>
              <div>
                <strong>Bikeztagram AI</strong>
                <small>Ready when you are</small>
              </div>
            </div>
            <textarea id="analysis-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} disabled={busy} />
            <div className="prompt-chips">
              <button onClick={() => setPrompt('Create a cinematic trailer with a slow reveal, rising tension, dynamic action and a powerful hero ending.')}>Cinematic Trailer</button>
              <button onClick={() => setPrompt('Fast-paced rhythmic edit perfectly synchronised to an electronic beat with crisp visual momentum.')}>Beat Sync</button>
              <button onClick={() => setPrompt('Warm lifestyle montage with natural framing, emotional depth, clean transitions and rich colour grade.')}>Lifestyle Montage</button>
            </div>
            <div className="action-row">
              <button className="primary-btn" onClick={analyse} disabled={busy || (!files.length && !sources.length)}>
                {loading ? 'Analyzing...' : '🎬 Run AI Director'}
              </button>
              <button className="secondary-btn" onClick={reset} disabled={busy}>Reset All</button>
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="progress-bar-wrap">
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                <span>Uploading: {uploadProgress}%</span>
              </div>
            )}
          </section>
        </section>

        {analysis && (
          <section className="glass-card analysis-card">
            <div className="section-title">
              <span>03</span>
              <h3>Director analysis</h3>
              <em>AI INSIGHTS</em>
            </div>
            <div className="analysis-content">
              <h4>{analysis.title || 'Cinematic Summary'}</h4>
              <p>{analysis.librarySummary || analysis.mood || 'Media successfully analyzed and structured.'}</p>
              {plan?.cuts?.length > 0 && (
                <div className="plan-summary">
                  <strong>Director Plan:</strong> {plan.cuts.length} cuts planned ({plan.cuts.reduce((acc, c) => acc + (Number(c.duration) || 2), 0).toFixed(1)}s total).
                </div>
              )}
              {captionResult?.cues?.length > 0 && (
                <div className="caption-summary" style={{ marginTop: '8px', fontSize: '13px', color: '#88ffbb' }}>
                  💬 {captionResult.appliedCount || captionResult.cues.length} speech caption(s) aligned to timeline.
                </div>
              )}
            </div>
            <div className="action-row" style={{ marginTop: '14px' }}>
              <button className="primary-btn pulse" onClick={render} disabled={busy}>
                {rendering ? 'Rendering...' : '✨ Render Cinematic Film'}
              </button>
              {isVideo && (
                <button className="secondary-btn" onClick={world} disabled={busy}>
                  🌍 World Bridge (6s AI Scene)
                </button>
              )}
            </div>
            {renderProgress > 0 && renderProgress < 100 && (
              <div className="progress-bar-wrap" style={{ marginTop: '12px' }}>
                <div className="progress-bar" style={{ width: `${renderProgress}%` }} />
                <span>Rendering: {renderProgress}%</span>
              </div>
            )}
          </section>
        )}

        {renderedUrl && (
          <section className="glass-card preview-card">
            <div className="section-title">
              <span>04</span>
              <h3>Finished AI Film</h3>
              <em>PREVIEW & EXPORT</em>
            </div>
            <div className="video-preview-wrap">
              <video src={renderedUrl} controls playsInline autoPlay loop />
            </div>
            {soundtrack && (
              <div className="soundtrack-info" style={{ marginTop: '10px', fontSize: '13px', color: '#ccddff' }}>
                🎵 Soundtrack: <strong>{soundtrack.genre || 'Cinematic'}</strong> ({soundtrack.bpm || 120} BPM) — Audio Available: {soundtrack.audioAvailable ? 'Yes' : 'Simulated'}
              </div>
            )}
            {qa && (
              <div className="qa-badge" style={{ marginTop: '10px', padding: '8px 12px', background: qa.verdict === 'PASS' ? 'rgba(50,200,100,0.15)' : 'rgba(200,150,50,0.15)', border: '1px solid ' + (qa.verdict === 'PASS' ? 'rgba(50,200,100,0.3)' : 'rgba(200,150,50,0.3)'), borderRadius: '6px' }}>
                <strong>QA Verdict:</strong> {qa.verdict} {attempts > 1 ? `(after ${attempts} attempts)` : ''}
              </div>
            )}
            <div className="action-row" style={{ marginTop: '14px', flexWrap: 'wrap' }}>
              <button className="primary-btn" onClick={exportFilm}>⬇️ Export MP4 (9:16)</button>
              <button className="secondary-btn" onClick={shareFilm}>📤 Share Film</button>
              <button className="secondary-btn" onClick={exportRhythmMap}>🎵 Export Rhythm Map</button>
            </div>
          </section>
        )}

        {worldUrl && (
          <section className="glass-card preview-card">
            <div className="section-title">
              <span>05</span>
              <h3>World Bridge Scene</h3>
              <em>AI GENERATED SCENE</em>
            </div>
            <div className="video-preview-wrap">
              <video src={worldUrl} controls playsInline autoPlay loop />
            </div>
          </section>
        )}

        {status && <div className="status-toast">{status}</div>}
        {error && (
          <div className="error-toast">
            <strong>{error.name}:</strong> {error.message}
          </div>
        )}
      </main>
    </div>
  );
}
