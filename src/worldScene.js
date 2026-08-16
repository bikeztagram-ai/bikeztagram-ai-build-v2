/* BIKEZTAGRAM AI — zero-cost procedural world-scene compositor. */
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

function drawBackground(ctx, w, h, mode, t) {
  const p = ease(t);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (mode === 'mars') { g.addColorStop(0, '#16080a'); g.addColorStop(.5, '#6e1d16'); g.addColorStop(1, '#d06b31'); }
  else if (mode === 'neon-city' || mode === 'future' || mode === 'drone-chase') { g.addColorStop(0, '#03040b'); g.addColorStop(.55, '#081b2b'); g.addColorStop(1, '#111a28'); }
  else if (mode === 'desert') { g.addColorStop(0, '#18202a'); g.addColorStop(.55, '#7b4b2b'); g.addColorStop(1, '#d4934d'); }
  else { g.addColorStop(0, '#02050a'); g.addColorStop(.65, '#0d2432'); g.addColorStop(1, '#182b33'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  if (mode === 'mars' || mode === 'desert') {
    ctx.fillStyle = mode === 'mars' ? 'rgba(255,160,80,.18)' : 'rgba(255,210,130,.14)';
    for (let i = 0; i < 70; i++) { const x = ((i * 137 + t * 90 * (i % 3 + 1)) % (w + 200)) - 100; const y = h * (.35 + ((i * 47) % 55) / 100); ctx.fillRect(x, y, 2 + (i % 4), 1); }
    ctx.fillStyle = 'rgba(30,10,8,.65)'; ctx.beginPath(); ctx.moveTo(0, h * .63);
    for (let x = 0; x <= w; x += 60) ctx.lineTo(x, h * (.59 + Math.sin(x / 170) * .035));
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  }

  if (mode === 'neon-city' || mode === 'future' || mode === 'drone-chase') {
    for (let i = 0; i < 24; i++) {
      const bw = 28 + (i % 5) * 16, bh = 130 + (i % 7) * 70, x = i * (w / 22) - 20, y = h * .57 - bh;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(20,42,62,.95)' : 'rgba(7,18,30,.96)'; ctx.fillRect(x, y, bw, bh);
      for (let wy = y + 20; wy < y + bh - 10; wy += 28) if ((Math.floor(wy) + i) % 3 !== 0) { ctx.fillStyle = i % 2 ? 'rgba(40,190,255,.32)' : 'rgba(255,40,180,.28)'; ctx.fillRect(x + 7, wy, 5, 9); }
    }
    ctx.strokeStyle = 'rgba(30,190,255,.16)'; ctx.lineWidth = 2;
    for (let i = -10; i < 12; i++) { ctx.beginPath(); ctx.moveTo(w / 2, h * .57); ctx.lineTo(w / 2 + i * w * .22, h); ctx.stroke(); }
  }
  if (mode === 'future') {
    ctx.strokeStyle = 'rgba(60,220,255,.24)'; ctx.lineWidth = 3;
    for (let r = 0; r < 8; r++) { ctx.beginPath(); ctx.arc(w * .5, h * .56, 120 + r * 90 + p * 25, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke(); }
  }
}

function drawDrones(ctx, w, h, t) {
  for (let i = 0; i < 3; i++) {
    const x = w * (.18 + i * .31) + Math.sin(t * 6 + i) * 45;
    const y = h * (.2 + (i % 2) * .12) + Math.cos(t * 5 + i) * 18;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3 + i) * .08);
    ctx.fillStyle = 'rgba(8,12,18,.95)'; ctx.fillRect(-28, -8, 56, 16);
    ctx.fillStyle = 'rgba(70,220,255,.8)'; ctx.fillRect(-18, 5, 10, 3); ctx.fillRect(8, 5, 10, 3);
    ctx.strokeStyle = 'rgba(180,220,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-34, -13); ctx.lineTo(34, -13); ctx.stroke(); ctx.restore();
  }
}

function drawAtmosphere(ctx, w, h, mode, t) {
  if (mode === 'drone-chase') { ctx.fillStyle = 'rgba(120,190,255,.08)'; for (let i = 0; i < 16; i++) { const y = ((i * 131 + t * 900) % (h + 100)) - 50; ctx.fillRect(0, y, w, 2); } drawDrones(ctx, w, h, t); }
  const v = ctx.createRadialGradient(w / 2, h * .48, h * .12, w / 2, h * .48, h * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.72)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}

async function loadVideo(source) {
  const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'auto'; video.crossOrigin = source.remote ? 'anonymous' : ''; video.src = source.url; video.load();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out loading source for world scene.')), 12000);
    const done = (err) => { clearTimeout(timer); video.removeEventListener('loadedmetadata', onMeta); video.removeEventListener('error', onError); err ? reject(err) : resolve(); };
    const onMeta = () => video.videoWidth ? done() : null;
    const onError = () => done(new Error(`Could not decode source for world scene (MediaError ${video.error?.code ?? 'unknown'}).`));
    video.addEventListener('loadedmetadata', onMeta); video.addEventListener('error', onError);
  });
  return video;
}

async function segmentMotorbike(sourceCanvas) {
  const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
  const segmenter = await ImageSegmenter.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' }, runningMode: 'IMAGE', outputCategoryMask: true, outputConfidenceMasks: false });
  const result = await segmenter.segment(sourceCanvas);
  const mask = result.categoryMask.getAsUint8Array(); const mw = result.categoryMask.width; const mh = result.categoryMask.height;
  const maskCanvas = document.createElement('canvas'); maskCanvas.width = mw; maskCanvas.height = mh; const mctx = maskCanvas.getContext('2d');
  const pixels = new Uint8ClampedArray(mw * mh * 4); let motorbikePixels = 0;
  for (let i = 0; i < mask.length; i++) { const a = mask[i] === MOTORBIKE_CLASS ? 255 : 0; if (a) motorbikePixels++; const j = i * 4; pixels[j] = 255; pixels[j + 1] = 255; pixels[j + 2] = 255; pixels[j + 3] = a; }
  mctx.putImageData(new ImageData(pixels, mw, mh), 0, 0); segmenter.close();
  if (motorbikePixels < mw * mh * .01) return null;
  return maskCanvas;
}

export async function renderWorldScene({ file, sourceUrl, prompt = '', duration = 6, onProgress }) {
  const source = sourceUrl ? { url: sourceUrl, remote: true } : { url: URL.createObjectURL(file), remote: false };
  try {
    const video = await loadVideo(source); video.currentTime = clamp(Number(video.duration) * .35, 0, Math.max(0, video.duration - .1));
    await new Promise((resolve) => { if (video.readyState >= 2) resolve(); else video.addEventListener('seeked', resolve, { once: true }); });
    const w = 1080, h = 1920; const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not create world-scene canvas.');
    const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = video.videoWidth; sourceCanvas.height = video.videoHeight; sourceCanvas.getContext('2d').drawImage(video, 0, 0);
    let mask = null; try { mask = await segmentMotorbike(sourceCanvas); } catch (error) { console.warn('[Bikeztagram] Motorbike segmentation unavailable; using stylized full-frame fallback.', error); }
    const foreground = document.createElement('canvas'); foreground.width = w; foreground.height = h; const fctx = foreground.getContext('2d');
    const sourceRatio = video.videoWidth / video.videoHeight, targetRatio = w / h; let dw, dh; if (sourceRatio > targetRatio) { dh = h * 1.02; dw = dh * sourceRatio; } else { dw = w * 1.02; dh = dw / sourceRatio; } const dx = (w - dw) / 2, dy = (h - dh) / 2;
    const mode = sceneMode(prompt); const stream = canvas.captureStream(30); const types = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4;codecs=h264','video/mp4']; const type = types.find((x) => MediaRecorder.isTypeSupported(x)) || ''; const recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); const chunks = [];
    const stopped = new Promise((resolve, reject) => { recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); }; recorder.onerror = (e) => reject(e.error || new Error('World scene recorder failed.')); recorder.onstop = () => chunks.length ? resolve(new Blob(chunks, { type: chunks[0].type || type || 'video/webm' })) : reject(new Error('World scene produced no video data.')); });
    recorder.start(1000); const started = performance.now();
    await new Promise((resolve) => { const frame = () => { const t = clamp((performance.now() - started) / (duration * 1000), 0, 1); drawBackground(ctx, w, h, mode, t);
      if (mask) { fctx.clearRect(0, 0, w, h); fctx.drawImage(sourceCanvas, dx, dy, dw, dh); fctx.globalCompositeOperation = 'destination-in'; fctx.drawImage(mask, dx, dy, dw, dh); fctx.globalCompositeOperation = 'source-over'; ctx.save(); const s = 1.03 + ease(t) * .08; ctx.translate(w / 2, h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2); ctx.drawImage(foreground, 0, 0); ctx.restore(); }
      else { ctx.save(); ctx.globalAlpha = .72; ctx.filter = 'brightness(.65) contrast(1.2) saturate(1.15)'; const s = 1.03 + ease(t) * .08; ctx.translate(w / 2, h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2); ctx.drawImage(sourceCanvas, dx, dy, dw, dh); ctx.restore(); }
      drawAtmosphere(ctx, w, h, mode, t); ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '700 48px Arial'; ctx.textAlign = 'center'; const label = mode === 'mars' ? 'MARS // ORIGINAL CINEMATIC SCENE' : mode === 'neon-city' ? 'NIGHT CITY // ORIGINAL SCENE' : mode === 'drone-chase' ? 'DRONE PURSUIT // ORIGINAL SCENE' : mode === 'desert' ? 'DESERT RUN // ORIGINAL SCENE' : 'FUTURE WORLD // ORIGINAL SCENE'; ctx.fillText(label, w / 2, h - 120); ctx.restore(); onProgress?.(Math.round(t * 100)); if (t >= 1) { resolve(); return; } requestAnimationFrame(frame); }; requestAnimationFrame(frame); });
    recorder.stop(); const output = await stopped; if (!output?.size) throw new Error('World scene renderer produced an empty video.'); return output;
  } finally { if (!sourceUrl) { try { URL.revokeObjectURL(source.url); } catch {} } }
}
