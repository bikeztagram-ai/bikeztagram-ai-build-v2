/* BIKEZTAGRAM AI — render media frame adapter.
   Converts already-resolved video/image sources into a common frame source.
   No upload, generation, Blob, Gemini, or credential changes. */

export async function loadRenderMedia(source) {
  if (!source?.url) throw new Error('Render media has no source URL.');
  const type = String(source.type || 'video').toLowerCase();

  if (type.startsWith('image')) {
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = source.remote ? 'anonymous' : '';
    image.src = source.url;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out loading generated image.')), 15000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Could not decode render image.')); };
    });
    return { kind: 'image', element: image, duration: Infinity };
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = source.remote ? 'anonymous' : '';
  video.src = source.url;
  video.load();
  await new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => finish(new Error('Timed out loading source video.')), 15000);
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener('loadedmetadata', ready);
      video.removeEventListener('loadeddata', ready);
      video.removeEventListener('canplay', ready);
      video.removeEventListener('error', failed);
    };
    const finish = (error) => { if (done) return; done = true; cleanup(); error ? reject(error) : resolve(); };
    const ready = () => { if (video.videoWidth && video.videoHeight && Number.isFinite(video.duration)) finish(); };
    const failed = () => finish(new Error(`Could not decode source video. MediaError code=${video.error?.code ?? 'unknown'}.`));
    video.addEventListener('loadedmetadata', ready);
    video.addEventListener('loadeddata', ready);
    video.addEventListener('canplay', ready);
    video.addEventListener('error', failed);
  });
  return { kind: 'video', element: video, duration: video.duration };
}

export function drawRenderMedia(ctx, frame, cut, p, canvas) {
  const element = frame?.element;
  if (!element) throw new Error('Render frame is unavailable.');
  const sw = element.videoWidth || element.naturalWidth;
  const sh = element.videoHeight || element.naturalHeight;
  if (!sw || !sh) throw new Error('Render media has no decoded dimensions.');

  const style = String(cut?.motionStyle || 'static').toLowerCase();
  const intensity = Math.max(0, Math.min(1.5, Number(cut?.motionIntensity) || 0.65));
  const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  let scale = 1.035, x = 0, y = 0;
  if (style === 'slow-push') scale += eased * .085 * intensity;
  else if (style === 'slow-pull') scale += (1 - eased) * .085 * intensity;
  else if (style === 'pan-left') { scale = 1.08; x = (.5 - eased) * canvas.width * .10 * intensity; }
  else if (style === 'pan-right') { scale = 1.08; x = (eased - .5) * canvas.width * .10 * intensity; }
  else if (style === 'tilt-up') { scale = 1.08; y = (.5 - eased) * canvas.height * .07 * intensity; }
  else if (style === 'tilt-down') { scale = 1.08; y = (eased - .5) * canvas.height * .07 * intensity; }

  const target = canvas.width / canvas.height;
  const ratio = sw / sh;
  let width, height;
  if (ratio > target) { height = canvas.height * scale; width = height * ratio; }
  else { width = canvas.width * scale; height = width / ratio; }
  ctx.drawImage(element, (canvas.width - width) / 2 + x, (canvas.height - height) / 2 + y, width, height);
}
