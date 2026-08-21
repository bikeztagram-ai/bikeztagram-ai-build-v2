/* BIKEZTAGRAM AI — final browser audio mux.
   Keeps the protected visual renderer untouched while ensuring a generated/original
   soundtrack is physically present in the final MediaRecorder output. */

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function waitForVideo(video) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) return resolve();
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Rendered video could not be decoded for audio mux.')); };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadedmetadata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

async function decodeAudio(audioDataUrl, context) {
  const response = await fetch(audioDataUrl);
  if (!response.ok) throw new Error(`Generated soundtrack could not be read (HTTP ${response.status}).`);
  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) throw new Error('Generated soundtrack is empty.');
  return context.decodeAudioData(buffer.slice(0));
}

export async function attachGeneratedAudioToVideo(videoBlob, audioDataUrl, { onProgress } = {}) {
  if (!(videoBlob instanceof Blob) || !videoBlob.size) throw new Error('Cannot mux audio into an empty video.');
  if (!audioDataUrl) return { blob: videoBlob, attached: false, reason: 'no-audio-data' };
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return { blob: videoBlob, attached: false, reason: 'browser-media-recorder-unavailable' };

  const videoStreamFactory = HTMLMediaElement?.prototype?.captureStream || HTMLVideoElement?.prototype?.captureStream;
  if (typeof videoStreamFactory !== 'function') return { blob: videoBlob, attached: false, reason: 'video-capture-stream-unavailable' };

  const videoUrl = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const mimeType = pickMimeType();
  if (!AudioCtx || !mimeType) {
    URL.revokeObjectURL(videoUrl);
    return { blob: videoBlob, attached: false, reason: 'audio-context-or-recorder-unavailable' };
  }

  const context = new AudioCtx();
  let source = null;
  let recorder = null;
  let stopped = false;
  const chunks = [];

  const cleanup = () => {
    try { source?.stop?.(); } catch {}
    try { source?.disconnect?.(); } catch {}
    try { context.close?.(); } catch {}
    try { video.pause(); } catch {}
    try { video.removeAttribute('src'); video.load(); } catch {}
    URL.revokeObjectURL(videoUrl);
  };

  try {
    await waitForVideo(video);
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration) throw new Error('Rendered video has no usable duration.');

    const audioBuffer = await decodeAudio(audioDataUrl, context);
    const videoStream = video.captureStream(30);
    const destination = context.createMediaStreamDestination();
    source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    source.connect(context.destination);

    const combined = new MediaStream();
    videoStream.getVideoTracks().forEach((track) => combined.addTrack(track));
    const audioTrack = destination.stream.getAudioTracks()[0];
    if (!audioTrack) throw new Error('Generated soundtrack produced no audio track.');
    combined.addTrack(audioTrack);

    recorder = new MediaRecorder(combined, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };

    const result = await new Promise((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Final audio/video recorder failed.'));
      recorder.onstop = () => {
        if (stopped) return;
        stopped = true;
        const blob = new Blob(chunks, { type: mimeType });
        if (!blob.size) return reject(new Error('Final audio/video mux produced an empty video.'));
        resolve(blob);
      };

      video.onended = () => {
        try { source.stop(); } catch {}
        if (recorder?.state !== 'inactive') recorder.stop();
      };

      recorder.start(250);
      context.resume().catch(() => {});
      source.start(0);
      onProgress?.(10);
      video.play().then(() => onProgress?.(25)).catch((error) => reject(new Error(`Rendered video playback was blocked during audio mux: ${error?.message || String(error)}`)));
    });

    onProgress?.(100);
    cleanup();
    return { blob: result, attached: true, mimeType, duration };
  } catch (error) {
    try { if (recorder?.state !== 'inactive') recorder.stop(); } catch {}
    cleanup();
    return { blob: videoBlob, attached: false, reason: error?.message || String(error) };
  }
}
