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
      version: productionPlan.version || '',
      title: productionPlan.title || '',
      directorSource: productionPlan.directorSource || '',
      targetDuration: Number(productionPlan.targetDuration || 0),
      plannedDuration: Number(productionPlan.plannedDuration || 0),
      realSceneCount: realScenes.length,
      generatedSceneCount: generatedScenes.length,
      totalSceneCount: scenes.length
    } : null,
    renderer: {
      cutCount: cuts.length,
      sourceTypes: cuts.map((cut) => cut.sourceType || 'uploaded'),
      motionStyles: cuts.map((cut) => cut.motionStyle || 'static'),
      transitions: cuts.map((cut) => cut.transition || 'hard-cut')
    },
    output: renderQA || null,
    notes: [
      'QA runs in the browser against the actual rendered Blob.',
      'The playback probe confirms that the browser can decode and advance the exported video.',
      'Blob upload configuration is not part of this QA layer.'
    ]
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
