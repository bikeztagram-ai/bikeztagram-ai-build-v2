/* BIKEZTAGRAM AI — browser-side QA helpers.
   No upload, Blob or Gemini configuration lives here. */

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

async function sampleVideoFrames(video, sampleCount = 5) {
  const width = video.videoWidth || 0, height = video.videoHeight || 0;
  if (!width || !height || !Number.isFinite(video.duration) || video.duration <= 0) return { samples: [], blackFrameRatio: null, averageLuma: null };
  const canvas = document.createElement('canvas'), sampleWidth = 96, sampleHeight = Math.max(54, Math.round(sampleWidth * height / width));
  canvas.width = sampleWidth; canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return { samples: [], blackFrameRatio: null, averageLuma: null };
  const originalTime = video.currentTime, samples = [];
  try {
    for (let i = 0; i < sampleCount; i += 1) {
      const target = video.duration * ((i + 0.5) / sampleCount);
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('QA frame sample timed out.')), 5000);
        const done = () => { clearTimeout(timeout); video.removeEventListener('seeked', done); resolve(); };
        video.addEventListener('seeked', done);
        try { video.currentTime = clamp(target, 0, Math.max(0, video.duration - 0.05)); } catch (error) { clearTimeout(timeout); video.removeEventListener('seeked', done); reject(error); }
      });
      ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
      const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data; let lumaSum = 0, brightPixels = 0;
      for (let p = 0; p < data.length; p += 4) { const luma = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]; lumaSum += luma; if (luma > 45) brightPixels += 1; }
      const pixelCount = data.length / 4, averageLuma = lumaSum / pixelCount;
      samples.push({ timeSeconds: Number(target.toFixed(2)), averageLuma: Number(averageLuma.toFixed(1)), visiblePixelRatio: Number((brightPixels / pixelCount).toFixed(3)) });
    }
  } finally { try { video.currentTime = originalTime; } catch {} }
  const blackFrames = samples.filter((sample) => sample.averageLuma < 12 || sample.visiblePixelRatio < 0.03).length;
  const averageLuma = samples.length ? samples.reduce((sum, sample) => sum + sample.averageLuma, 0) / samples.length : null;
  return { samples, blackFrameRatio: samples.length ? Number((blackFrames / samples.length).toFixed(2)) : null, averageLuma: averageLuma == null ? null : Number(averageLuma.toFixed(1)) };
}

async function probeRenderedAudio(blobUrl) {
  if (typeof window === 'undefined') return { detected: false, reason: 'browser-unavailable' };
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return { detected: false, reason: 'audio-context-unavailable' };
  const context = new AudioCtx(), audio = document.createElement('audio');
  audio.src = blobUrl; audio.preload = 'auto'; audio.crossOrigin = 'anonymous';
  let source = null, analyser = null;
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('QA audio metadata timed out.')), 8000);
      const done = () => { clearTimeout(timeout); cleanup(); resolve(); };
      const fail = () => { clearTimeout(timeout); cleanup(); reject(new Error(`QA audio element failed (MediaError code=${audio.error?.code ?? 'unknown'}).`)); };
      const cleanup = () => { audio.removeEventListener('loadedmetadata', done); audio.removeEventListener('canplay', done); audio.removeEventListener('error', fail); };
      audio.addEventListener('loadedmetadata', done, { once: true }); audio.addEventListener('canplay', done, { once: true }); audio.addEventListener('error', fail, { once: true }); audio.load();
    });
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) throw new Error('QA audio track has no usable duration.');
    source = context.createMediaElementSource(audio); analyser = context.createAnalyser(); analyser.fftSize = 1024; source.connect(analyser);
    await context.resume(); if (context.state !== 'running') throw new Error(`QA audio context did not start (state: ${context.state}).`);
    await audio.play();
    await new Promise((resolve) => setTimeout(resolve, 350));
    const data = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(data);
    let sum = 0; for (const value of data) { const n = (value - 128) / 128; sum += n * n; }
    const rms = Math.sqrt(sum / data.length);
    audio.pause();
    return { detected: rms > 0.006, rms: Number(rms.toFixed(4)), durationSeconds: Number(audio.duration.toFixed(2)), reason: rms > 0.006 ? 'audio-signal-detected' : 'no-audible-signal-detected' };
  } catch (error) { return { detected: false, rms: 0, reason: error?.message || String(error) }; }
  finally { try { audio.pause(); } catch {} try { source?.disconnect?.(); } catch {} try { analyser?.disconnect?.(); } catch {} try { context.close?.(); } catch {} try { audio.removeAttribute('src'); audio.load(); } catch {} }
}

export async function validateRenderedVideo(blob, expectedDuration = 15, options = {}) {
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error('QA: renderer returned an empty video blob.');
  const url = URL.createObjectURL(blob), video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'metadata';
  try {
    const metadata = await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('QA: rendered video metadata did not load within 10 seconds.')), 10000); video.onloadedmetadata = () => { clearTimeout(timeout); resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight }); }; video.onerror = () => { clearTimeout(timeout); reject(new Error('QA: browser could not decode the rendered video.')); }; video.src = url; video.load(); });
    if (!Number.isFinite(metadata.duration) || metadata.duration <= 0) throw new Error('QA: rendered video has no valid duration.');
    const playbackStart = performance.now(); await video.play(); await new Promise((resolve) => setTimeout(resolve, 900)); const playbackSeconds = Math.max(0, video.currentTime); video.pause();
    if (playbackSeconds <= 0) throw new Error('QA: rendered video loaded but did not advance during playback.');
    const frameQA = await sampleVideoFrames(video, 5), durationDifference = Math.abs(metadata.duration - Number(expectedDuration || metadata.duration));
    const tooDark = frameQA.blackFrameRatio != null && frameQA.blackFrameRatio >= 0.6;
    const requireAudio = Boolean(options.requireAudio), audioQA = requireAudio ? await probeRenderedAudio(url) : { detected: false, required: false, reason: 'not-required' };
    const audioFailed = requireAudio && !audioQA.detected;
    return { passed: !tooDark && !audioFailed, blobBytes: blob.size, blobMB: Number((blob.size / 1024 / 1024).toFixed(2)), durationSeconds: Number(metadata.duration.toFixed(2)), expectedDurationSeconds: Number(expectedDuration || 0), durationDifferenceSeconds: Number(durationDifference.toFixed(2)), width: metadata.width, height: metadata.height, playbackProbeSeconds: Number(playbackSeconds.toFixed(2)), playbackProbeElapsedMs: Math.round(performance.now() - playbackStart), frameQA, audioQA, codecCheck: 'Browser decoded rendered video successfully', verdict: tooDark ? 'FAIL_TOO_DARK' : (audioFailed ? 'FAIL_NO_AUDIO' : (durationDifference <= 1.5 ? 'PASS' : 'PASS_WITH_DURATION_DIFFERENCE')) };
  } finally { try { video.pause(); } catch {} video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}

export function buildDirectorQAReport({ file, analysis, productionPlan, renderPlan, renderQA }) {
  const scenes = Array.isArray(productionPlan?.scenes) ? productionPlan.scenes : [], realScenes = scenes.filter((scene) => scene.sourceType === 'uploaded'), generatedScenes = scenes.filter((scene) => scene.sourceType === 'generated'), cuts = Array.isArray(renderPlan?.cuts) ? renderPlan.cuts : [], realFootageOnly = generatedScenes.length === 0;
  const editorialChecks = [
    { check: 'real-footage-first', passed: realFootageOnly, detail: `${realScenes.length} real scenes, ${generatedScenes.length} generated scenes` },
    { check: 'multiple-cuts', passed: cuts.length >= 3, detail: `${cuts.length} executable cuts` },
    { check: 'cinematic-motion', passed: cuts.filter((cut) => cut.motionStyle && cut.motionStyle !== 'static').length >= Math.min(2, cuts.length), detail: `${cuts.filter((cut) => cut.motionStyle && cut.motionStyle !== 'static').length} motion-treated cuts` },
    { check: 'varied-transitions', passed: new Set(cuts.map((cut) => cut.transition || 'hard-cut')).size >= Math.min(2, cuts.length), detail: `${new Set(cuts.map((cut) => cut.transition || 'hard-cut')).size} transition types` },
    { check: 'output-decodes', passed: Boolean(renderQA?.codecCheck), detail: renderQA?.codecCheck || 'not tested' },
    { check: 'output-not-black', passed: renderQA?.verdict !== 'FAIL_TOO_DARK', detail: renderQA?.frameQA ? `blackFrameRatio=${renderQA.frameQA.blackFrameRatio}, averageLuma=${renderQA.frameQA.averageLuma}` : 'not tested' },
    { check: 'audio-present-when-required', passed: renderQA?.audioQA?.required === false || renderQA?.audioQA?.detected === true, detail: renderQA?.audioQA?.reason || 'not required/not tested' }
  ];
  const technicalPass = Boolean(renderQA?.passed), editorialPass = editorialChecks.every((item) => item.passed);
  return { generatedAt: new Date().toISOString(), verdict: technicalPass && editorialPass ? 'PASS' : 'NEEDS_IMPROVEMENT', source: file ? { name: file.name, bytes: file.size, type: file.type } : null, analysis: analysis ? { filename: analysis.filename || file?.name || '', durationSeconds: Number(analysis.durationInSeconds || 0), bestMomentCount: Array.isArray(analysis.bestMoments) ? analysis.bestMoments.length : 0 } : null, director: productionPlan ? { version: productionPlan.version || '', title: productionPlan.title || '', directorSource: productionPlan.directorSource || '', mode: productionPlan.mode || '', targetDuration: Number(productionPlan.targetDuration || 0), plannedDuration: Number(productionPlan.plannedDuration || 0), realSceneCount: realScenes.length, generatedSceneCount: generatedScenes.length, totalSceneCount: scenes.length } : null, renderer: { cutCount: cuts.length, sourceTypes: cuts.map((cut) => cut.sourceType || 'uploaded'), motionStyles: cuts.map((cut) => cut.motionStyle || 'static'), transitions: cuts.map((cut) => cut.transition || 'hard-cut') }, editorialChecks, output: renderQA || null, notes: ['QA runs in the browser against the actual rendered video.', 'Playback and frame probes confirm the browser can decode, advance and sample the exported video.', 'When music is required, QA also probes the final container for a non-silent audio signal.', 'Only small QA metadata is sent to /api/qa-report; video bytes are never sent there.', 'Blob upload configuration is not part of this QA layer.'] };
}

export function downloadQAReport(report) { const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `bikeztagram-qa-${Date.now()}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }

async function postAutoQA(report) { try { await fetch('/api/qa-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) }); } catch (error) { console.warn('[QA] Could not send automatic QA report:', error?.message || error); } }

function installAutomaticQAObserver() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return; if (window.__bikeztagramAutoQAInstalled) return; window.__bikeztagramAutoQAInstalled = true; const tested = new WeakSet();
  const testVideoElement = async (video) => {
    if (!(video instanceof HTMLVideoElement) || tested.has(video)) return; tested.add(video);
    const waitForMetadata = () => new Promise((resolve) => { if (video.readyState >= 1 && video.videoWidth) return resolve(); const timeout = setTimeout(resolve, 12000); video.addEventListener('loadedmetadata', () => { clearTimeout(timeout); resolve(); }, { once: true }); });
    await waitForMetadata(); if (!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration) || video.duration <= 0) return;
    try { const clone = document.createElement('video'); clone.muted = true; clone.playsInline = true; clone.preload = 'auto'; clone.src = video.currentSrc || video.src; await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('auto-QA metadata timeout')), 10000); clone.onloadedmetadata = () => { clearTimeout(timeout); resolve(); }; clone.onerror = () => { clearTimeout(timeout); reject(new Error('auto-QA browser decode failed')); }; clone.load(); }); const playbackStart = performance.now(); await clone.play(); await new Promise((resolve) => setTimeout(resolve, 700)); const advanced = clone.currentTime > 0.05; clone.pause(); const frameQA = await sampleVideoFrames(clone, 3); const report = { generatedAt:new Date().toISOString(), kind:'automatic-render-observer', sourceUrlType:(video.currentSrc || video.src || '').startsWith('blob:') ? 'blob-url' : 'other', durationSeconds:Number(clone.duration.toFixed(2)), width:clone.videoWidth, height:clone.videoHeight, blobLikeOutput:(video.currentSrc || video.src || '').startsWith('blob:'), playbackAdvanced:advanced, playbackProbeMs:Math.round(performance.now()-playbackStart), frameQA, verdict:advanced && !(frameQA.blackFrameRatio != null && frameQA.blackFrameRatio >= 0.67) ? 'PASS' : 'NEEDS_IMPROVEMENT' }; window.__bikeztagramLastAutoQA = report; await postAutoQA(report); console.info('[QA] Automatic render QA complete', report); clone.pause(); clone.removeAttribute('src'); clone.load(); }
    catch (error) { const report = { generatedAt:new Date().toISOString(), kind:'automatic-render-observer', verdict:'FAIL', error:error?.message || String(error) }; window.__bikeztagramLastAutoQA = report; await postAutoQA(report); console.error('[QA] Automatic render QA failed', report); }
  };
  const scan = (root) => { if (root instanceof HTMLVideoElement) testVideoElement(root); if (root?.querySelectorAll) root.querySelectorAll('video').forEach(testVideoElement); }; new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach(scan))).observe(document.documentElement, { childList:true, subtree:true }); document.querySelectorAll('video').forEach(testVideoElement);
}
installAutomaticQAObserver();
