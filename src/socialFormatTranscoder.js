/* BIKEZTAGRAM AI — browser-side social output formatter.
 *
 * The cinematic renderer intentionally renders a stable 9:16 master. This
 * module converts that finished master into the selected social canvas size
 * without re-running the AI director or the expensive render pass.
 */
import { OUTPUT_PRESETS } from './outputPresets.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function getPreset(presetId = 'portrait') {
  return OUTPUT_PRESETS[presetId] || OUTPUT_PRESETS.portrait;
}

function createVideo(blob) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('error', onError);
      fn(value);
    };
    const onMetadata = () => finish(resolve, { video, url });
    const onError = () => finish(reject, new Error('Could not decode the finished film for social formatting.'));
    video.muted = false;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('loadedmetadata', onMetadata, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.src = url;
    video.load();
  });
}

function drawCover(ctx, video, width, height) {
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let drawWidth;
  let drawHeight;
  if (sourceRatio > targetRatio) {
    drawHeight = height;
    drawWidth = drawHeight * sourceRatio;
  } else {
    drawWidth = width;
    drawHeight = drawWidth / sourceRatio;
  }
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(video, x, y, drawWidth, drawHeight);
}

export async function transcodeSocialFormat(blob, presetId = 'portrait', onProgress) {
  if (!(blob instanceof Blob) || !blob.size) {
    throw new Error('Social formatting requires a finished video Blob.');
  }

  const preset = getPreset(presetId);
  if (preset.id === 'portrait') {
    onProgress?.(100);
    return blob;
  }

  const { video, url } = await createVideo(blob);
  const canvas = document.createElement('canvas');
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error('Could not create the social-format canvas.');
  }

  const canvasStream = canvas.captureStream(30);
  const sourceStream = typeof video.captureStream === 'function'
    ? video.captureStream()
    : (typeof video.mozCaptureStream === 'function' ? video.mozCaptureStream() : null);
  if (sourceStream) {
    for (const track of sourceStream.getAudioTracks()) canvasStream.addTrack(track);
  }

  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  if (!mimeType && !window.MediaRecorder) {
    URL.revokeObjectURL(url);
    throw new Error('This browser cannot record the selected social output format.');
  }

  const chunks = [];
  const recorder = mimeType
    ? new MediaRecorder(canvasStream, { mimeType })
    : new MediaRecorder(canvasStream);

  const output = await new Promise((resolve, reject) => {
    let stopped = false;
    const cleanup = () => {
      try { for (const track of canvasStream.getTracks()) track.stop(); } catch {}
      try { video.pause(); } catch {}
      URL.revokeObjectURL(url);
    };
    const fail = (error) => {
      if (stopped) return;
      stopped = true;
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const finish = () => {
      if (stopped) return;
      stopped = true;
      cleanup();
      resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
    };

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = (event) => fail(event.error || new Error('Social format recording failed.'));
    video.onerror = () => fail(new Error('The finished film could not be played during social formatting.'));
    video.onended = () => {
      try { recorder.stop(); } catch (error) { fail(error); }
    };

    recorder.start(250);
    video.currentTime = 0;
    video.play().catch((error) => fail(new Error(`Could not play the finished film for social formatting: ${error.message}`)));

    const renderFrame = () => {
      if (stopped) return;
      drawCover(ctx, video, preset.width, preset.height);
      const duration = Number(video.duration) || 1;
      const progress = clamp((video.currentTime / duration) * 100, 0, 100);
      onProgress?.(Math.round(progress));
      if (!video.ended) requestAnimationFrame(renderFrame);
    };
    requestAnimationFrame(renderFrame);
  });

  if (!(output instanceof Blob) || !output.size) {
    throw new Error(`Social formatting produced an empty ${preset.label} video.`);
  }
  onProgress?.(100);
  return output;
}

export function describeSocialFormat(presetId = 'portrait') {
  const preset = getPreset(presetId);
  return `${preset.label} • ${preset.width}×${preset.height} • ${preset.platforms.join(', ')}`;
}
