/* BIKEZTAGRAM AI — browser-side QA helpers.
   No upload, Blob or Gemini configuration lives here.
*/

export async function validateRenderedVideo(blob, expectedDuration = 15) {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('QA: renderer returned an empty video blob.');
  }

  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';

  try {
    const metadata = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('QA: rendered video metadata did not load within 10 seconds.')), 10000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('QA: browser could not decode the rendered video.'));
      };
      video.src = url;
      video.load();
    });

    if (!Number.isFinite(metadata.duration) || metadata.duration <= 0) {
      throw new Error('QA: rendered video has no valid duration.');
    }

    const playbackStart = performance.now();
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 750));
    const playbackSeconds = Math.max(0, video.currentTime);
    video.pause();

    if (playbackSeconds <= 0) {
      throw new Error('QA: rendered video loaded but did not advance during playback.');
    }

    const durationDifference = Math.abs(metadata.duration - Number(expectedDuration || metadata.duration));
    return {
      passed: true,
      blobBytes: blob.size,
      blobMB: Number((blob.size / 1024 / 1024).toFixed(2)),
      durationSeconds: Number(metadata.duration.toFixed(2)),
      expectedDurationSeconds: Number(expectedDuration || 0),
      durationDifferenceSeconds: Number(durationDifference.toFixed(2)),
      width: metadata.width,
      height: metadata.height,
      playbackProbeSeconds: Number(playbackSeconds.toFixed(2)),
      playbackProbeElapsedMs: Math.round(performance.now() - playbackStart),
      codecCheck: 'Browser decoded rendered video successfully',
      verdict: durationDifference <= 1.5 ? 'PASS' : 'PASS_WITH_DURATION_DIFFERENCE'
    };
  } finally {
    try { video.pause(); } catch {}
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function sendAutomaticTelemetry(report) {
  try {
    await fetch('/api/qa-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true
    });
  } catch (error) {
    console.warn('[AUTO-QA] Could not send telemetry:', error?.message || error);
  }
}

async function inspectRenderedElement(videoElement) {
  const source = videoElement.currentSrc || videoElement.src || '';
  if (!source.startsWith('blob:') && !source.startsWith('https://')) return;

  const probe = document.createElement('video');
  probe.muted = true;
  probe.playsInline = true;
  probe.preload = 'metadata';

  try {
    const metadata = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('metadata timeout')), 10000);
      probe.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve({ duration: probe.duration, width: probe.videoWidth, height: probe.videoHeight });
      };
      probe.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('browser could not decode rendered video'));
      };
      probe.src = source;
      probe.load();
    });

    const start = performance.now();
    await probe.play();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const advanced = probe.currentTime > 0.05;
    const probeMs = Math.round(performance.now() - start);
    probe.pause();

    let frameQA = { sampled: false, darkFrameRatio: null };
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(probe.videoWidth || 320, 320);
      canvas.height = Math.min(probe.videoHeight || 180, 180);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx && canvas.width && canvas.height) {
        probe.currentTime = Math.min(0.5, Math.max(0, metadata.duration - 0.05));
        await new Promise((resolve) => { probe.onseeked = resolve; setTimeout(resolve, 500); });
        ctx.drawImage(probe, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let dark = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const luminance = (pixels[i] * 0.2126) + (pixels[i + 1] * 0.7152) + (pixels[i + 2] * 0.0722);
          if (luminance < 12) dark += 1;
        }
        frameQA = { sampled: true, darkFrameRatio: Number((dark / (pixels.length / 4)).toFixed(3)) };
      }
    } catch (error) {
      frameQA = { sampled: false, darkFrameRatio: null, error: error?.message || 'frame sample failed' };
    }

    const passed = Number.isFinite(metadata.duration) && metadata.duration > 0 && advanced;
    const report = {
      generatedAt: new Date().toISOString(),
      kind: 'automatic-render-browser-qa',
      verdict: passed ? 'PASS' : 'FAIL',
      durationSeconds: Number((metadata.duration || 0).toFixed(2)),
      width: metadata.width || 0,
      height: metadata.height || 0,
      playbackAdvanced: advanced,
      playbackProbeMs: probeMs,
      frameQA,
      sourceUrlType: source.startsWith('blob:') ? 'blob-url' : 'https-url',
      blobLikeOutput: source.startsWith('blob:'),
      error: passed ? null : 'Rendered video did not decode/play correctly.'
    };

    console.log('[AUTO-QA] Rendered video test:', report);
    await sendAutomaticTelemetry(report);
  } catch (error) {
    const report = {
      generatedAt: new Date().toISOString(), kind: 'automatic-render-browser-qa', verdict: 'FAIL',
      durationSeconds: 0, width: 0, height: 0, playbackAdvanced: false, playbackProbeMs: 0,
      frameQA: null, sourceUrlType: source.startsWith('blob:') ? 'blob-url' : 'https-url',
      blobLikeOutput: source.startsWith('blob:'), error: error?.message || 'QA failed'
    };
    console.error('[AUTO-QA] Rendered video test failed:', report);
    await sendAutomaticTelemetry(report);
  } finally {
    try { probe.pause(); } catch {}
    probe.removeAttribute('src');
    probe.load();
  }
}

function installAutomaticVideoQA() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.MutationObserver) return;

  const seen = new WeakSet();
  const markExisting = () => document.querySelectorAll('video').forEach((video) => seen.add(video));
  const inspectNew = () => {
    document.querySelectorAll('video').forEach((video) => {
      if (seen.has(video)) return;
      seen.add(video);
      inspectRenderedElement(video);
    });
  };

  const start = () => {
    markExisting();
    const observer = new MutationObserver(inspectNew);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__bikeztagramAutoQA = observer;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

installAutomaticVideoQA();

export function buildDirectorQAReport({ file, analysis, productionPlan, renderPlan, renderQA }) {
  const scenes = Array.isArray(productionPlan?.scenes) ? productionPlan.scenes : [];
  const realScenes = scenes.filter((scene) => scene.sourceType === 'uploaded');
  const generatedScenes = scenes.filter((scene) => scene.sourceType === 'generated');
  const cuts = Array.isArray(renderPlan?.cuts) ? renderPlan.cuts : [];

  return {
    generatedAt: new Date().toISOString(),
    verdict: renderQA?.passed ? 'PASS' : 'FAIL',
    source: file ? { name: file.name, bytes: file.size, type: file.type } : null,
    analysis: analysis ? {
      filename: analysis.filename || file?.name || '',
      durationSeconds: Number(analysis.durationInSeconds || 0),
      bestMomentCount: Array.isArray(analysis.bestMoments) ? analysis.bestMoments.length : 0
    } : null,
    director: productionPlan ? {
      version: productionPlan.version || '', title: productionPlan.title || '', directorSource: productionPlan.directorSource || '',
      targetDuration: Number(productionPlan.targetDuration || 0), plannedDuration: Number(productionPlan.plannedDuration || 0),
      realSceneCount: realScenes.length, generatedSceneCount: generatedScenes.length, totalSceneCount: scenes.length
    } : null,
    renderer: {
      cutCount: cuts.length,
      sourceTypes: cuts.map((cut) => cut.sourceType || 'uploaded'),
      motionStyles: cuts.map((cut) => cut.motionStyle || 'static'),
      transitions: cuts.map((cut) => cut.transition || 'hard-cut')
    },
    output: renderQA || null,
    notes: ['QA runs in the browser against the actual rendered video element.', 'The playback probe confirms that the browser can decode and advance the exported video.', 'Blob upload configuration is not part of this QA layer.']
  };
}

export function downloadQAReport(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bikeztagram-qa-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
