import { createOriginalPulseWav } from './musicProvider';

export async function renderProject(media, plan, onProgress) {
  if (!plan.cuts?.length) throw new Error('No selected shots to render.');

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  const stream = canvas.captureStream(30);
  
  // Set up audio from the pulse generator
  const musicBlob = createOriginalPulseWav(Math.max(30, plan.duration + 4), 112);
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(await musicBlob.arrayBuffer());
  const audioSource = audioContext.createBufferSource();
  const dest = audioContext.createMediaStreamDestination();
  audioSource.buffer = audioBuffer;
  audioSource.connect(dest);

  // Combine video stream with generated audio stream
  const combinedStream = new MediaStream([
    ...stream.getVideoTracks(),
    ...dest.getAudioTracks()
  ]);

  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=h264')
    ? 'video/mp4;codecs=h264'
    : MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : 'video/webm';

  const recorder = new MediaRecorder(combinedStream, { mimeType });
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const filesMap = new Map(media.map(m => [m.id, m]));

  // Preload all images and video elements into memory
  const loadedAssets = new Map();
  for (const cut of plan.cuts) {
    const item = filesMap.get(cut.mediaId);
    if (!item || loadedAssets.has(cut.mediaId)) continue;

    if (item.type.startsWith('image')) {
      const img = new Image();
      img.src = URL.createObjectURL(item.file);
      await new Promise((res) => { img.onload = res; });
      loadedAssets.set(cut.mediaId, { type: 'image', element: img });
    } else {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(item.file);
      video.muted = true;
      video.playsInline = true;
      await new Promise((res) => { video.onloadedmetadata = res; });
      loadedAssets.set(cut.mediaId, { type: 'video', element: video });
    }
  }

  // Draw scaled media centered on 1080x1920 vertical canvas
  function drawMedia(asset, videoTime = 0) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1080, 1920);

    const el = asset.element;
    const srcW = asset.type === 'image' ? el.naturalWidth : el.videoWidth;
    const srcH = asset.type === 'image' ? el.naturalHeight : el.videoHeight;

    if (asset.type === 'video') {
      el.currentTime = videoTime;
    }

    const scale = Math.min(1080 / srcW, 1920 / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const offsetX = (1080 - drawW) / 2;
    const offsetY = (1920 - drawH) / 2;

    ctx.drawImage(el, offsetX, offsetY, drawW, drawH);
  }

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mimeType });
      onProgress?.(100);
      resolve(finalBlob);
    };

    recorder.start();
    audioSource.start(0);

    let currentCutIndex = 0;
    let cutStartTime = performance.now();
    const fps = 30;
    const frameInterval = 1000 / fps;
    const totalDurationMs = plan.duration * 1000;
    const renderStartTime = performance.now();

    const intervalId = setInterval(() => {
      const now = performance.now();
      const elapsedTotal = now - renderStartTime;

      if (elapsedTotal >= totalDurationMs || currentCutIndex >= plan.cuts.length) {
        clearInterval(intervalId);
        recorder.stop();
        audioSource.stop();
        return;
      }

      const currentCut = plan.cuts[currentCutIndex];
      const elapsedCut = (now - cutStartTime) / 1000;

      if (elapsedCut >= currentCut.duration) {
        currentCutIndex++;
        cutStartTime = now;
        if (currentCutIndex >= plan.cuts.length) return;
      }

      const cut = plan.cuts[currentCutIndex];
      const asset = loadedAssets.get(cut.mediaId);

      if (asset) {
        const videoTime = (cut.start || 0) + ((now - cutStartTime) / 1000);
        drawMedia(asset, videoTime);
      }

      const progressPct = Math.min(99, Math.round((elapsedTotal / totalDurationMs) * 100));
      onProgress?.(progressPct);
    }, frameInterval);
  });
}
