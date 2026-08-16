/* BIKEZTAGRAM AI — zero-cost procedural world-scene compositor v2. */
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite';
const MOTORBIKE_CLASS = 14;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const ease = (v) => v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;

function sceneMode(prompt = '') {
  const p = String(prompt).toLowerCase();
  if (/mars|red planet|martian|alien planet/.test(p)) return 'mars';
  if (/gta|grand theft|open world|crime|street race|neon city|night city/.test(p)) return 'neon-city';
  if (/drone|drones|pursuit|chase|military/.test(p)) return 'drone-chase';
  if (/desert|dust|sand/.test(p)) return 'desert';
  if (/future|futuristic|sci-fi|cyber/.test(p)) return 'future';
  return 'cinematic-world';
}

function drawBackground(ctx, w, h, mode, t, phase) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (mode === 'mars') { g.addColorStop(0, '#100407'); g.addColorStop(.45, '#5d1814'); g.addColorStop(1, '#c45c2d'); }
  else if (mode === 'neon-city' || mode === 'future' || mode === 'drone-chase') { g.addColorStop(0, '#02030a'); g.addColorStop(.55, '#071a2a'); g.addColorStop(1, '#111827'); }
  else if (mode === 'desert') { g.addColorStop(0, '#111923'); g.addColorStop(.52, '#74472b'); g.addColorStop(1, '#d18c4a'); }
  else { g.addColorStop(0, '#010409'); g.addColorStop(.65, '#0a2230'); g.addColorStop(1, '#172c35'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  // Distant horizon glow / atmosphere.
  const glow = ctx.createRadialGradient(w * (.5 + Math.sin(t * 2) * .04), h * .43, 10, w * .5, h * .48, h * .55);
  glow.addColorStop(0, mode === 'mars' ? 'rgba(255,130,60,.20)' : 'rgba(60,190,255,.12)');
  glow.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

  if (mode === 'mars' || mode === 'desert') {
    ctx.fillStyle = mode === 'mars' ? 'rgba(255,170,90,.18)' : 'rgba(255,220,140,.14)';
    for (let i = 0; i < 95; i++) { const x = ((i * 137 + t * 120 * (i % 3 + 1)) % (w + 240)) - 120; const y = h * (.30 + ((i * 47) % 60) / 100); ctx.fillRect(x, y, 2 + (i % 5), 1 + (i % 2)); }
    ctx.fillStyle = 'rgba(25,8,8,.78)'; ctx.beginPath(); ctx.moveTo(0, h * .62);
    for (let x = 0; x <= w; x += 50) ctx.lineTo(x, h * (.57 + Math.sin(x / 170 + phase) * .035));
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  }

  if (mode === 'neon-city' || mode === 'future' || mode === 'drone-chase') {
    for (let i = 0; i < 30; i++) {
      const bw = 24 + (i % 6) * 15, bh = 120 + (i % 8) * 70, x = i * (w / 27) - 20, y = h * .57 - bh;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(18,42,62,.97)' : 'rgba(5,15,26,.98)'; ctx.fillRect(x, y, bw, bh);
      for (let wy = y + 18; wy < y + bh - 10; wy += 26) if ((Math.floor(wy) + i) % 3 !== 0) { ctx.fillStyle = i % 2 ? 'rgba(40,190,255,.34)' : 'rgba(255,40,180,.30)'; ctx.fillRect(x + 6, wy, 5, 8); }
    }
    ctx.strokeStyle = 'rgba(30,190,255,.17)'; ctx.lineWidth = 2;
    for (let i = -12; i < 13; i++) { ctx.beginPath(); ctx.moveTo(w / 2, h * .57); ctx.lineTo(w / 2 + i * w * .22, h); ctx.stroke(); }
  }
  if (mode === 'future') {
    ctx.strokeStyle = 'rgba(60,220,255,.24)'; ctx.lineWidth = 3;
    for (let r = 0; r < 9; r++) { ctx.beginPath(); ctx.arc(w * .5, h * .56, 110 + r * 88 + ease(t) * 35, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke(); }
  }
}

function drawRoadAndPerspective(ctx, w, h, mode, t, phase) {
  const horizon = h * .60;
  ctx.fillStyle = mode === 'mars' ? 'rgba(72,24,18,.95)' : mode === 'neon-city' || mode === 'future' || mode === 'drone-chase' ? 'rgba(4,9,15,.97)' : 'rgba(72,48,32,.95)';
  ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(w, horizon); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  ctx.strokeStyle = mode === 'mars' ? 'rgba(255,150,70,.25)' : 'rgba(90,210,255,.20)'; ctx.lineWidth = 5;
  for (let i = -5; i <= 5; i++) { const bx = w / 2 + i * w * .22; ctx.beginPath(); ctx.moveTo(w / 2 + i * 8, horizon); ctx.lineTo(bx, h); ctx.stroke(); }
  for (let i = 0; i < 11; i++) { const p = ((i / 11 + t * (1.2 + phase * .1)) % 1); const y = horizon + Math.pow(p, 1.8) * (h - horizon); const width = 2 + p * 16; ctx.fillStyle = mode === 'mars' ? 'rgba(255,170,90,.22)' : 'rgba(90,220,255,.24)'; ctx.fillRect(w / 2 - width / 2, y, width, Math.max(2, p * 22)); }
}

function drawDrones(ctx, w, h, t, aggressive = false) {
  for (let i = 0; i < 3; i++) {
    const baseX = w * (.18 + i * .31);
    const x = baseX + Math.sin(t * (5 + i) + i) * (aggressive ? 70 : 45);
    const y = h * (.17 + (i % 2) * .12) + Math.cos(t * 4 + i) * 22;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3 + i) * .08);
    ctx.fillStyle = 'rgba(5,9,15,.98)'; ctx.fillRect(-30, -8, 60, 16);
    ctx.fillStyle = i === 1 ? 'rgba(255,65,65,.9)' : 'rgba(70,220,255,.85)'; ctx.fillRect(-18, 5, 10, 3); ctx.fillRect(8, 5, 10, 3);
    ctx.strokeStyle = 'rgba(180,220,255,.65)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-36, -13); ctx.lineTo(36, -13); ctx.stroke();
    if (aggressive) { const beam = ctx.createLinearGradient(0, 0, 0, 300); beam.addColorStop(0, 'rgba(255,60,60,.10)'); beam.addColorStop(1, 'rgba(255,60,60,0)'); ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(10, 10); ctx.lineTo(55, 300); ctx.lineTo(-55, 300); ctx.fill(); }
    ctx.restore();
  }
}

function drawAtmosphere(ctx, w, h, mode, t, phase) {
  if (mode === 'drone-chase') { ctx.fillStyle = 'rgba(120,190,255,.08)'; for (let i = 0; i < 20; i++) { const y = ((i * 131 + t * 1050) % (h + 100)) - 50; ctx.fillRect(0, y, w, 2); } drawDrones(ctx, w, h, t, phase > 0.5); }
  if (mode === 'mars' || mode === 'desert') { ctx.fillStyle = mode === 'mars' ? 'rgba(235,100,55,.11)' : 'rgba(230,180,120,.10)'; for (let i = 0; i < 30; i++) { const x = ((i * 211 + t * 700 * (1 + i % 4)) % (w + 200)) - 100; const y = h * (.48 + ((i * 31) % 45) / 100); ctx.fillRect(x, y, 8 + i % 9, 2 + i % 3); } }
  const v = ctx.createRadialGradient(w / 2, h * .48, h * .10, w / 2, h * .48, h * .78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(.72, 'rgba(0,0,0,.16)'); v.addColorStop(1, 'rgba(0,0,0,.78)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}

async function loadVideo(source) {
  const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'auto'; video.crossOrigin = source.remote ? 'anonymous' : ''; video.src = source.url; video.load();
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Timed out loading source for world scene.')), 12000); const done = (err) => { clearTimeout(timer); video.removeEventListener('loadedmetadata', onMeta); video.removeEventListener('error', onError); err ? reject(err) : resolve(); }; const onMeta = () => video.videoWidth ? done() : null; const onError = () => done(new Error(`Could not decode source for world scene (MediaError ${video.error?.code ?? 'unknown'}).`)); video.addEventListener('loadedmetadata', onMeta); video.addEventListener('error', onError); });
  return video;
}

async function segmentMotorbike(sourceCanvas) {
  const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
  const segmenter = await ImageSegmenter.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' }, runningMode: 'IMAGE', outputCategoryMask: true, outputConfidenceMasks: false });
  const result = await segmenter.segment(sourceCanvas); const mask = result.categoryMask.getAsUint8Array(); const mw = result.categoryMask.width; const mh = result.categoryMask.height; const maskCanvas = document.createElement('canvas'); maskCanvas.width = mw; maskCanvas.height = mh; const mctx = maskCanvas.getContext('2d'); const pixels = new Uint8ClampedArray(mw * mh * 4); let motorbikePixels = 0;
  for (let i = 0; i < mask.length; i++) { const a = mask[i] === MOTORBIKE_CLASS ? 255 : 0; if (a) motorbikePixels++; const j = i * 4; pixels[j] = 255; pixels[j + 1] = 255; pixels[j + 2] = 255; pixels[j + 3] = a; }
  mctx.putImageData(new ImageData(pixels, mw, mh), 0, 0); segmenter.close(); if (motorbikePixels < mw * mh * .01) return null; return maskCanvas;
}

function drawSubjectShadow(ctx, w, h, t, mode) {
  ctx.save(); const pulse = .9 + Math.sin(t * Math.PI * 2) * .04; ctx.translate(w / 2, h * .80); ctx.scale(1, .18); const g = ctx.createRadialGradient(0, 0, 10, 0, 0, w * .25); g.addColorStop(0, mode === 'mars' ? 'rgba(0,0,0,.70)' : 'rgba(0,0,0,.58)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, w * .28 * pulse, h * .07, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export async function renderWorldScene({ file, sourceUrl, prompt = '', duration = 8, onProgress }) {
  const source = sourceUrl ? { url: sourceUrl, remote: true } : { url: URL.createObjectURL(file), remote: false };
  try {
    const video = await loadVideo(source); video.currentTime = clamp(Number(video.duration) * .35, 0, Math.max(0, video.duration - .1)); await new Promise((resolve) => { if (video.readyState >= 2) resolve(); else video.addEventListener('seeked', resolve, { once: true }); });
    const w = 1080, h = 1920; const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not create world-scene canvas.');
    const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = video.videoWidth; sourceCanvas.height = video.videoHeight; sourceCanvas.getContext('2d').drawImage(video, 0, 0);
    let mask = null; try { mask = await segmentMotorbike(sourceCanvas); } catch (error) { console.warn('[Bikeztagram] Motorbike segmentation unavailable; using stylized full-frame fallback.', error); }
    const foreground = document.createElement('canvas'); foreground.width = w; foreground.height = h; const fctx = foreground.getContext('2d');
    const sourceRatio = video.videoWidth / video.videoHeight, targetRatio = w / h; let dw, dh; if (sourceRatio > targetRatio) { dh = h * 1.02; dw = dh * sourceRatio; } else { dw = w * 1.02; dh = dw / sourceRatio; } const dx = (w - dw) / 2, dy = (h - dh) / 2;
    const mode = sceneMode(prompt); const stream = canvas.captureStream(30); const types = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4;codecs=h264','video/mp4']; const type = types.find((x) => MediaRecorder.isTypeSupported(x)) || ''; const recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); const chunks = [];
    const stopped = new Promise((resolve, reject) => { recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); }; recorder.onerror = (e) => reject(e.error || new Error('World scene recorder failed.')); recorder.onstop = () => chunks.length ? resolve(new Blob(chunks, { type: chunks[0].type || type || 'video/webm' })) : reject(new Error('World scene produced no video data.')); });
    recorder.start(1000); const started = performance.now();
    await new Promise((resolve) => { const frame = () => { const t = clamp((performance.now() - started) / (duration * 1000), 0, 1); const phase = t < .34 ? t / .34 : t < .70 ? (t - .34) / .36 : (t - .70) / .30; const phaseIndex = t < .34 ? 0 : t < .70 ? 1 : 2; drawBackground(ctx, w, h, mode, t, phase); drawRoadAndPerspective(ctx, w, h, mode, t, phase);
      drawSubjectShadow(ctx, w, h, t, mode);
      const cameraZoom = phaseIndex === 0 ? 1.02 + ease(phase) * .08 : phaseIndex === 1 ? 1.10 + Math.sin(phase * Math.PI) * .07 : 1.17 - ease(phase) * .07; const shake = phaseIndex === 2 ? Math.sin(t * 70) * 2.2 : 0;
      if (mask) { fctx.clearRect(0, 0, w, h); fctx.drawImage(sourceCanvas, dx, dy, dw, dh); fctx.globalCompositeOperation = 'destination-in'; fctx.drawImage(mask, dx, dy, dw, dh); fctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(w / 2 + shake, h / 2); ctx.scale(cameraZoom, cameraZoom); ctx.translate(-w / 2, -h / 2); ctx.drawImage(foreground, 0, 0); ctx.restore(); }
      else { ctx.save(); ctx.globalAlpha = .74; ctx.filter = 'brightness(.62) contrast(1.25) saturate(1.18)'; ctx.translate(w / 2 + shake, h / 2); ctx.scale(cameraZoom, cameraZoom); ctx.translate(-w / 2, -h / 2); ctx.drawImage(sourceCanvas, dx, dy, dw, dh); ctx.restore(); }
      if (phaseIndex === 1 && (mode === 'mars' || mode === 'desert')) { ctx.fillStyle = 'rgba(255,170,90,.12)'; for (let i = 0; i < 35; i++) { const x = ((i * 97 + t * 1100 * (i % 3 + 1)) % (w + 120)) - 60; const y = h * (.62 + ((i * 31) % 32) / 100); ctx.fillRect(x, y, 18 + i % 15, 2 + i % 3); } }
      drawAtmosphere(ctx, w, h, mode, t, phase); ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.font = '700 46px Arial'; ctx.textAlign = 'center'; const label = mode === 'mars' ? 'MARS // ORIGINAL WORLD' : mode === 'neon-city' ? 'NIGHT CITY // ORIGINAL WORLD' : mode === 'drone-chase' ? 'DRONE PURSUIT // ORIGINAL WORLD' : mode === 'desert' ? 'DESERT RUN // ORIGINAL WORLD' : 'FUTURE WORLD // ORIGINAL WORLD'; ctx.fillText(label, w / 2, h - 120); ctx.restore(); onProgress?.(Math.round(t * 100)); if (t >= 1) { resolve(); return; } requestAnimationFrame(frame); }; requestAnimationFrame(frame); });
    recorder.stop(); const output = await stopped; if (!output?.size) throw new Error('World scene renderer produced an empty video.'); return output;
  } finally { if (!sourceUrl) { try { URL.revokeObjectURL(source.url); } catch {} } }
}
