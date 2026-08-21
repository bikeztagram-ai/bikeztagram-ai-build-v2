/* BIKEZTAGRAM AI — final soundtrack mux.
   This runs after the protected visual renderer and before final QA.
   Blob/Gemini/upload infrastructure is intentionally untouched. */

function recorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ].find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function waitForVideo(video) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) return resolve();
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Final audio mux: rendered video did not become playable.')); }, 10000);
    const ready = () => { clearTimeout(timeout); cleanup(); resolve(); };
    const error = () => { clearTimeout(timeout); cleanup(); reject(new Error('Final audio mux: rendered video could not be decoded.')); };
    const cleanup = () => { video.removeEventListener('loadedmetadata', ready); video.removeEventListener('canplay', ready); video.removeEventListener('error', error); };
    video.addEventListener('loadedmetadata', ready, { once: true });
    video.addEventListener('canplay', ready, { once: true });
    video.addEventListener('error', error, { once: true });
    video.load();
  });
}

async function decodeAudio(context, dataUrl) {
  const response = await fetch(dataUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Final audio mux: soundtrack fetch failed (HTTP ${response.status}).`);
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength) throw new Error('Final audio mux: soundtrack is empty.');
  const buffer = await context.decodeAudioData(bytes.slice(0));
  if (!buffer?.duration) throw new Error('Final audio mux: soundtrack has no duration.');
  return buffer;
}

export async function attachGeneratedAudioToVideo(videoBlob, audioDataUrl, { onProgress } = {}) {
  if (!(videoBlob instanceof Blob) || !videoBlob.size) throw new Error('Final audio mux: empty video.');
  if (!audioDataUrl) return { blob: videoBlob, attached: false, reason: 'no-audio-data' };
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return { blob: videoBlob, attached: false, reason: 'browser-recorder-unavailable' };

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const mimeType = recorderMimeType();
  if (!AudioCtx || !mimeType || typeof HTMLVideoElement === 'undefined') return { blob: videoBlob, attached: false, reason: 'browser-audio-mux-unavailable' };
  if (typeof HTMLVideoElement.prototype.captureStream !== 'function') return { blob: videoBlob, attached: false, reason: 'video-capture-stream-unavailable' };

  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const context = new AudioCtx();
  let source = null;
  let recorder = null;
  let timer = null;
  const chunks = [];

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    try { source?.stop?.(); } catch {}
    try { source?.disconnect?.(); } catch {}
    try { context.close?.(); } catch {}
    try { video.pause(); } catch {}
    try { video.removeAttribute('src'); video.load(); } catch {}
    URL.revokeObjectURL(videoUrl);
  };

  try {
    await waitForVideo(video);
    const audioBuffer = await decodeAudio(context, audioDataUrl);
    await context.resume();
    if (context.state !== 'running') throw new Error(`Final audio mux: audio context did not start (${context.state}).`);

    const videoStream = video.captureStream(30);
    const audioDestination = context.createMediaStreamDestination();
    source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioDestination);

    const audioTrack = audioDestination.stream.getAudioTracks()[0];
    if (!audioTrack) throw new Error('Final audio mux: no audio track was produced.');

    const combined = new MediaStream();
    videoStream.getVideoTracks().forEach((track) => combined.addTrack(track));
    combined.addTrack(audioTrack);

    recorder = new MediaRecorder(combined, { mimeType });
    recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };

    const output = await new Promise((resolve, reject) => {
      let finished = false;
      const stop = () => {
        if (finished) return;
        finished = true;
        try { if (recorder.state !== 'inactive') recorder.stop(); } catch (error) { reject(error); }
      };
      recorder.onerror = () => reject(new Error('Final audio mux: MediaRecorder failed.'));
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        if (!blob.size) return reject(new Error('Final audio mux: recorder produced an empty video.'));
        resolve(blob);
      };
      video.onended = stop;
      timer = setTimeout(stop, Math.max(1500, Math.ceil((Number(video.duration) || 15) * 1000) + 3000));
      recorder.start(250);
      source.start(0);
      onProgress?.(10);
      video.play().then(() => onProgress?.(25)).catch((error) => reject(new Error(`Final audio mux: video playback failed (${error?.message || String(error)}).`)));
    });

    onProgress?.(100);
    cleanup();
    return { blob: output, attached: true, mimeType, duration: Number(video.duration || 0) };
  } catch (error) {
    try { if (recorder?.state !== 'inactive') recorder.stop(); } catch {}
    cleanup();
    return { blob: videoBlob, attached: false, reason: error?.message || String(error) };
  }
}
