/* BIKEZTAGRAM AI — post-render output preset adapter.
   The protected 1080x1920 filmmaker renderer stays untouched. This adapter
   converts an already-rendered film to another supported canvas shape while
   preserving the original editorial timing and attempting to retain audio.
*/

import { resolveOutputPreset } from './outputPresets.js';
import { validateExportedVideo } from './socialExport.js';

const waitForEvent = (target, event, timeout = 20000) => new Promise((resolve, reject) => {
  let timer = null;
  const cleanup = () => {
    target.removeEventListener(event, onEvent);
    if (timer) clearTimeout(timer);
  };
  const onEvent = () => { cleanup(); resolve(); };
  target.addEventListener(event, onEvent, { once: true });
  timer = setTimeout(() => { cleanup(); reject(new Error(`Timed out waiting for media ${event}.`)); }, timeout);
});

const chooseMimeType = () => {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4'
  ];
  return types.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';
};

export async function transcodeRenderedFilmToPreset(blob, presetValue = 'portrait', creativePrompt = '') {
  if (!(blob instanceof Blob) || !blob.size) throw new Error('No rendered film is available for output conversion.');
  const preset = resolveOutputPreset(presetValue, creativePrompt);
  if (preset.id === 'portrait' && Number(preset.width) === 1080 && Number(preset.height) === 1920) return blob;
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') throw new Error('This browser cannot perform output-preset conversion.');

  const sourceUrl = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.playsInline = true;
  video.src = sourceUrl;

  try {
    await waitForEvent(video, 'loadedmetadata');
    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Rendered film has no usable duration.');

    const canvas = document.createElement('canvas');
    canvas.width = preset.width;
    canvas.height = preset.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create output canvas.');

    const canvasStream = canvas.captureStream(30);
    let sourceStream = null;
    if (typeof video.captureStream === 'function') sourceStream = video.captureStream();
    else if (typeof video.mozCaptureStream === 'function') sourceStream = video.mozCaptureStream();
    if (sourceStream) for (const track of sourceStream.getAudioTracks()) canvasStream.addTrack(track);

    const mimeType = chooseMimeType();
    if (!mimeType) throw new Error('No supported browser video recording format is available.');
    const chunks = [];
    const recorder = new MediaRecorder(canvasStream, { mimeType });
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) chunks.push(event.data); });
      recorder.addEventListener('error', () => reject(new Error('Output preset recorder failed.')), { once: true });
      recorder.addEventListener('stop', resolve, { once: true });
    });

    const sourceWidth = video.videoWidth || 1080;
    const sourceHeight = video.videoHeight || 1920;
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = preset.width / preset.height;
    let drawWidth = preset.width;
    let drawHeight = preset.height;
    if (sourceRatio > targetRatio) drawWidth = drawHeight * sourceRatio;
    else drawHeight = drawWidth / sourceRatio;
    const offsetX = (preset.width - drawWidth) / 2;
    const offsetY = (preset.height - drawHeight) / 2;

    let isFinished = false;
    const stopRecording = () => {
      if (isFinished) return;
      isFinished = true;
      try { if (recorder.state !== 'inactive') recorder.stop(); } catch {}
    };

    const draw = () => {
      if (video.ended || video.currentTime >= duration) {
        stopRecording();
        return;
      }
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, preset.width, preset.height);
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
      requestAnimationFrame(draw);
    };

    video.currentTime = 0;
    await video.play();
    recorder.start(250);
    draw();

    await Promise.race([
      waitForEvent(video, 'ended', Math.max(20000, duration * 1000 + 10000)),
      new Promise((resolve) => {
        const checkEnd = setInterval(() => {
          if (video.ended || video.currentTime >= duration) {
            clearInterval(checkEnd);
            resolve();
          }
        }, 100);
      })
    ]);

    stopRecording();
    await stopped;
    for (const track of canvasStream.getTracks()) track.stop();
    if (sourceStream) for (const track of sourceStream.getTracks()) track.stop();

    const output = new Blob(chunks, { type: mimeType });
    if (!output.size) throw new Error('Output preset conversion produced an empty film.');

    await validateExportedVideo(output, preset.id);
    return output;
  } finally {
    try { video.pause(); } catch {}
    try { video.removeAttribute('src'); video.load(); } catch {}
    URL.revokeObjectURL(sourceUrl);
  }
}
