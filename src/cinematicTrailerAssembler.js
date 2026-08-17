/* BIKEZTAGRAM AI — browser-side trailer assembler. £0-only. */

export async function assembleCinematicTrailer(results = [], { fps = 30, mimeType = 'video/webm;codecs=vp9,opus', onProgress, signal } = {}) {
  if (!Array.isArray(results) || results.length === 0) throw new Error('No generated shots are available to assemble.');
  if (!window.MediaRecorder) throw new Error('This browser does not support trailer assembly.');

  const videos = [];
  let audioContext = null;
  let destination = null;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    destination = audioContext.createMediaStreamDestination();
    for (let i = 0; i < results.length; i += 1) {
      if (signal?.aborted) throw new DOMException('Assembly cancelled.', 'AbortError');
      const source = results[i]?.blob || results[i];
      if (!(source instanceof Blob) || source.size === 0) throw new Error(`Shot ${i + 1} has no valid video.`);
      const url = URL.createObjectURL(source);
      const video = document.createElement('video');
      video.src = url; video.muted = false; video.volume = 1; video.playsInline = true; video.preload = 'auto';
      await waitForMetadata(video, signal);
      try { audioContext.createMediaElementSource(video).connect(destination); } catch { /* video may have no usable audio track */ }
      videos.push({ video, url });
    }

    const width = Math.max(...videos.map(({ video }) => video.videoWidth || 832));
    const height = Math.max(...videos.map(({ video }) => video.videoHeight || 480));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(fps);
    const combined = new MediaStream([...stream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(combined, { mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm' });
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
    recorder.start(250);

    for (let i = 0; i < videos.length; i += 1) {
      const { video } = videos[i];
      if (audioContext.state === 'suspended') await audioContext.resume();
      video.currentTime = 0; await waitForSeek(video, signal); await video.play();
      while (!video.ended) {
        if (signal?.aborted) throw new DOMException('Assembly cancelled.', 'AbortError');
        ctx.drawImage(video, 0, 0, width, height);
        const progress = Math.round(((i + Math.min(1, video.currentTime / Math.max(video.duration || 1, 1))) / videos.length) * 100);
        onProgress?.(progress);
        await nextFrame();
      }
      video.pause();
    }

    recorder.stop();
    await new Promise((resolve) => { recorder.onstop = resolve; });
    stream.getTracks().forEach((track) => track.stop()); destination.stream.getTracks().forEach((track) => track.stop());
    await audioContext.close();
    return new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
  } finally {
    videos.forEach(({ video, url }) => { video.pause(); video.removeAttribute('src'); URL.revokeObjectURL(url); });
    if (audioContext && audioContext.state !== 'closed') await audioContext.close().catch(() => {});
  }
}

function waitForMetadata(video, signal) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 1) return resolve();
    const done = () => { cleanup(); resolve(); }; const fail = () => { cleanup(); reject(new Error('Generated shot could not be loaded for assembly.')); };
    const abort = () => { cleanup(); reject(new DOMException('Assembly cancelled.', 'AbortError')); };
    const cleanup = () => { video.removeEventListener('loadedmetadata', done); video.removeEventListener('error', fail); signal?.removeEventListener('abort', abort); };
    video.addEventListener('loadedmetadata', done, { once: true }); video.addEventListener('error', fail, { once: true }); signal?.addEventListener('abort', abort, { once: true });
  });
}

function waitForSeek(video, signal) { return new Promise((resolve, reject) => { if (video.readyState >= 2 && video.currentTime === 0) return resolve(); const done = () => { cleanup(); resolve(); }; const abort = () => { cleanup(); reject(new DOMException('Assembly cancelled.', 'AbortError')); }; const cleanup = () => { video.removeEventListener('seeked', done); signal?.removeEventListener('abort', abort); }; video.addEventListener('seeked', done, { once: true }); signal?.addEventListener('abort', abort, { once: true }); video.currentTime = 0; }); }
function nextFrame() { return new Promise((resolve) => requestAnimationFrame(resolve)); }
