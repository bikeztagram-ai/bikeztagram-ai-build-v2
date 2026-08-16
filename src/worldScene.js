/* BIKEZTAGRAM AI — zero-cost procedural world-scene compositor v4.
   Product layer only: Blob/Gemini upload and configuration are intentionally untouched. */
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

function drawBackground(ctx, w, h, mode, t, shot) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (mode === 'mars') { g.addColorStop(0, '#100407'); g.addColorStop(.45, '#671b16'); g.addColorStop(1, '#c45c2d'); }
  else if (mode === 'neon-city' || mode === 'future' || mode === 'drone-chase') { g.addColorStop(0, '#01020a'); g.addColorStop(.52, '#071b2c'); g.addColorStop(1, '#111827'); }
  else if (mode === 'desert') { g.addColorStop(0, '#111923'); g.addColorStop(.50, '#74472b'); g.addColorStop(1, '#d18c4a'); }
  else { g.addColorStop(0, '#010409'); g.addColorStop(.62, '#0a2230'); g.addColorStop(1, '#172c35'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  const sunX = w * (.50 + Math.sin(t * 1.6) * .05);
  const glow = ctx.createRadialGradient(sunX, h * .34, 10, sunX, h * .40, h * .58);
  glow.addColorStop(0, mode === 'mars' ? 'rgba(255,130,60,.25)' : 'rgba(60,190,255,.14)');
  glow.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

  if (mode === 'mars' || mode === 'desert') {
    ctx.fillStyle = mode === 'mars' ? 'rgba(255,170,90,.18)' : 'rgba(255,220,140,.14)';
    for (let i = 0; i < 120; i++) {
      const x = ((i * 137 + t * 150 * (i % 3 + 1)) % (w + 240)) - 120;
      const y = h * (.25 + ((i * 47) % 65) / 100);
      ctx.fillRect(x, y, 2 + (i % 5), 1 + (i % 2));
    }
    ctx.fillStyle = mode === 'mars' ? 'rgba(25,8,8,.90)' : 'rgba(45,27,18,.86)';
    ctx.beginPath(); ctx.moveTo(0, h * .61);
    for (let x = 0; x <= w; x += 40) ctx.lineTo(x, h * (.56 + Math.sin(x / 155 + t * .8) * .045));
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  }

  if (mode === 'neon-city' || mode === 'future' || mode === 'drone-chase') {
    for (let i = 0; i < 34; i++) {
      const bw = 22 + (i % 6) * 16, bh = 120 + (i % 8) * 72;
      const x = i * (w / 30) - 25, y = h * .58 - bh;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(18,42,62,.98)' : 'rgba(4,13,23,.99)';
      ctx.fillRect(x, y, bw, bh);
      for (let wy = y + 16; wy < y + bh - 10; wy += 24) {
        if ((Math.floor(wy) + i) % 3 !== 0) {
          ctx.fillStyle = i % 2 ? 'rgba(40,190,255,.40)' : 'rgba(255,40,180,.34)';
          ctx.fillRect(x + 6, wy, 5, 8);
        }
      }
    }
    ctx.strokeStyle = 'rgba(30,190,255,.20)'; ctx.lineWidth = 2;
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath(); ctx.moveTo(w / 2, h * .58); ctx.lineTo(w / 2 + i * w * .21, h); ctx.stroke();
    }
  }

  if (mode === 'future') {
    ctx.strokeStyle = 'rgba(60,220,255,.28)'; ctx.lineWidth = 3;
    for (let r = 0; r < 10; r++) {
      ctx.beginPath(); ctx.arc(w * .5, h * .56, 110 + r * 88 + ease(t) * 45, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
    }
  }

  // Deliberate cinematic shot differences: reveal, action, hero.
  if (shot === 1) {
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, 0, w, h * .14);
  } else if (shot === 2) {
    ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(0, 0, w, h);
  }
}

function drawRoad(ctx, w, h, mode, t, shot) {
  const horizon = h * (shot === 0 ? .61 : .58);
  ctx.fillStyle = mode === 'mars' ? 'rgba(72,24,18,.97)' : mode === 'neon-city' || mode === 'future' || mode === 'drone-chase' ? 'rgba(3,8,14,.98)' : 'rgba(72,48,32,.96)';
  ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(w, horizon); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  ctx.strokeStyle = mode === 'mars' ? 'rgba(255,150,70,.28)' : 'rgba(90,210,255,.22)'; ctx.lineWidth = 5;
  for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * 6, horizon); ctx.lineTo(w / 2 + i * w * .22, h); ctx.stroke(); }
  for (let i = 0; i < 13; i++) {
    const p = ((i / 13 + t * (1.3 + shot * .25)) % 1);
    const y = horizon + Math.pow(p, 1.75) * (h - horizon);
    const width = 2 + p * 18;
    ctx.fillStyle = mode === 'mars' ? 'rgba(255,170,90,.28)' : 'rgba(90,220,255,.26)';
    ctx.fillRect(w / 2 - width / 2, y, width, Math.max(2, p * 22));
  }
}

function drawDrones(ctx, w, h, t, aggressive) {
  for (let i = 0; i < 3; i++) {
    const baseX = w * (.18 + i * .31);
    const x = baseX + Math.sin(t * (5 + i) + i) * (aggressive ? 85 : 50);
    const y = h * (.16 + (i % 2) * .12) + Math.cos(t * 4 + i) * 25;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3 + i) * .08);
    ctx.fillStyle = 'rgba(4,8,14,.99)'; ctx.fillRect(-34, -9, 68, 18);
    ctx.fillStyle = i === 1 ? 'rgba(255,65,65,.95)' : 'rgba(70,220,255,.90)';
    ctx.fillRect(-20, 6, 11, 3); ctx.fillRect(9, 6, 11, 3);
    ctx.strokeStyle = 'rgba(180,220,255,.70)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-40, -14); ctx.lineTo(40, -14); ctx.stroke();
    if (aggressive) {
      const beam = ctx.createLinearGradient(0, 0, 0, 360); beam.addColorStop(0, 'rgba(255,60,60,.13)'); beam.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(-11, 10); ctx.lineTo(11, 10); ctx.lineTo(65, 360); ctx.lineTo(-65, 360); ctx.fill();
    }
    ctx.restore();
  }
}

function drawAtmosphere(ctx, w, h, mode, t, shot) {
  if (mode === 'drone-chase') {
    ctx.fillStyle = 'rgba(120,190,255,.09)';
    for (let i = 0; i < 24; i++) { const y = ((i * 131 + t * 1100) % (h + 100)) - 50; ctx.fillRect(0, y, w, 2); }
    drawDrones(ctx, w, h, t, shot === 1);
  }
  if (mode === 'mars' || mode === 'desert') {
    ctx.fillStyle = mode === 'mars' ? 'rgba(235,100,55,.12)' : 'rgba(230,180,120,.11)';
    for (let i = 0; i < 36; i++) { const x = ((i * 211 + t * 760 * (1 + i % 4)) % (w + 200)) - 100; const y = h * (.45 + ((i * 31) % 48) / 100); ctx.fillRect(x, y, 8 + i % 9, 2 + i % 3); }
  }
  if (shot === 1) {
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 8; i++) ctx.fillRect(0, h * (.2 + i * .08) + Math.sin(t * 7 + i) * 8, w, 2);
  }
  const v = ctx.createRadialGradient(w / 2, h * .46, h * .10, w / 2, h * .46, h * .78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(.72, 'rgba(0,0,0,.16)'); v.addColorStop(1, 'rgba(0,0,0,.80)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}

async function loadVideo(source) {
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  video.crossOrigin = source.remote ? 'anonymous' : ''; video.src = source.url; video.load();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out loading source for world scene.')), 12000);
    const done = (err) => { clearTimeout(timer); video.removeEventListener('loadedmetadata', onMeta); video.removeEventListener('error', onError); err ? reject(err) : resolve(); };
    const onMeta = () => video.videoWidth ? done() : null;
    const onError = () => done(new Error(`Could not decode source for world scene (MediaError ${video.error?.code ?? 'unknown'}).`));
    video.addEventListener('loadedmetadata', onMeta); video.addEventListener('error', onError);
  });
  return video;
}

function makeCleanMotorbikeMask(result) {
  const confidence = result.confidenceMasks?.[MOTORBIKE_CLASS];
  if (!confidence) return null;
  const values = confidence.getAsFloat32Array();
  const mw = confidence.width, mh = confidence.height;
  const threshold = 0.58;
  const alpha = new Uint8Array(mw * mh);
  let minX = mw, minY = mh, maxX = 0, maxY = 0, count = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] < threshold) continue;
    const x = i % mw, y = (i / mw) | 0;
    alpha[i] = clamp(Math.round((values[i] - threshold) / (1 - threshold) * 255), 0, 255);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); count++;
  }
  if (!count) return null;

  // Restrict weak stray detections to an expanded subject envelope. This is a cheap
  // browser-side matte refinement and avoids carrying large pieces of the old background.
  const padX = Math.round((maxX - minX) * .12), padY = Math.round((maxY - minY) * .12);
  const left = Math.max(0, minX - padX), right = Math.min(mw - 1, maxX + padX);
  const top = Math.max(0, minY - padY), bottom = Math.min(mh - 1, maxY + padY);
  const image = new ImageData(mw, mh);
  for (let i = 0; i < alpha.length; i++) {
    const x = i % mw, y = (i / mw) | 0;
    let a = alpha[i];
    if (x < left || x > right || y < top || y > bottom) a = 0;
    const edgeX = Math.min(x - left, right - x), edgeY = Math.min(y - top, bottom - y);
    if (edgeX < 5 || edgeY < 5) a = Math.round(a * .55);
    const j = i * 4; image.data[j] = 255; image.data[j + 1] = 255; image.data[j + 2] = 255; image.data[j + 3] = a;
  }
  const maskCanvas = document.createElement('canvas'); maskCanvas.width = mw; maskCanvas.height = mh;
  const mctx = maskCanvas.getContext('2d'); mctx.putImageData(image, 0, 0);
  return maskCanvas;
}

async function segmentMotorbike(sourceCanvas) {
  const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
  const segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
    runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true,
  });
  try { return makeCleanMotorbikeMask(await segmenter.segment(sourceCanvas)); }
  finally { segmenter.close(); }
}

function drawSubjectShadow(ctx, w, h, scale, mode) {
  ctx.save(); ctx.translate(w / 2, h * .82); ctx.scale(1, .18);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, w * .28);
  g.addColorStop(0, mode === 'mars' ? 'rgba(0,0,0,.75)' : 'rgba(0,0,0,.62)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, w * .28 * scale, h * .07, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawGrade(ctx, w, h, mode, t) {
  ctx.save(); ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = mode === 'mars' ? 'rgba(255,95,45,.075)' : 'rgba(15,55,85,.06)'; ctx.fillRect(0, 0, w, h);
  const top = ctx.createLinearGradient(0, 0, 0, h * .35); top.addColorStop(0, 'rgba(0,0,0,.28)'); top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top; ctx.fillRect(0, 0, w, h * .35); ctx.restore();
}

export async function renderWorldScene({ file, sourceUrl, prompt = '', duration = 8, onProgress }) {
  const source = sourceUrl ? { url: sourceUrl, remote: true } : { url: URL.createObjectURL(file), remote: false };
  try {
    const video = await loadVideo(source);
    video.currentTime = clamp(Number(video.duration) * .35, 0, Math.max(0, video.duration - .1));
    await new Promise((resolve) => { if (video.readyState >= 2) resolve(); else video.addEventListener('seeked', resolve, { once: true }); });

    const w = 1080, h = 1920;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not create world-scene canvas.');
    const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = video.videoWidth; sourceCanvas.height = video.videoHeight;
    sourceCanvas.getContext('2d').drawImage(video, 0, 0);

    let mask = null;
    try { mask = await segmentMotorbike(sourceCanvas); }
    catch (error) { console.warn('[Bikeztagram] Motorbike matte unavailable; using full-frame fallback.', error); }

    const foreground = document.createElement('canvas'); foreground.width = w; foreground.height = h;
    const fctx = foreground.getContext('2d');
    const sourceRatio = video.videoWidth / video.videoHeight, targetRatio = w / h;
    let dw, dh; if (sourceRatio > targetRatio) { dh = h * 1.02; dw = dh * sourceRatio; } else { dw = w * 1.02; dh = dw / sourceRatio; }
    const dx = (w - dw) / 2, dy = (h - dh) / 2;
    const mode = sceneMode(prompt);

    const stream = canvas.captureStream(30);
    const types = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4;codecs=h264','video/mp4'];
    const type = types.find((x) => MediaRecorder.isTypeSupported(x)) || '';
    const recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
    const chunks = [];
    const stopped = new Promise((resolve, reject) => {
      recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
      recorder.onerror = (e) => reject(e.error || new Error('World scene recorder failed.'));
      recorder.onstop = () => chunks.length ? resolve(new Blob(chunks, { type: chunks[0].type || type || 'video/webm' })) : reject(new Error('World scene produced no video data.'));
    });

    recorder.start(500);
    const started = performance.now();
    await new Promise((resolve) => {
      const frame = () => {
        const t = clamp((performance.now() - started) / (duration * 1000), 0, 1);
        const shot = t < .34 ? 0 : t < .70 ? 1 : 2;
        const shotT = shot === 0 ? t / .34 : shot === 1 ? (t - .34) / .36 : (t - .70) / .30;
        const shotEase = ease(clamp(shotT, 0, 1));
        const scale = shot === 0 ? 1.02 + shotEase * .08 : shot === 1 ? 1.11 + Math.sin(shotT * Math.PI) * .09 : 1.20 - shotEase * .16;
        const xOffset = shot === 0 ? -w * .025 * shotEase : shot === 1 ? Math.sin(shotT * Math.PI) * w * .055 : w * .035 * shotEase;
        const yOffset = shot === 1 ? Math.sin(shotT * Math.PI) * h * .015 : shot === 2 ? -h * .02 * shotEase : 0;
        const shake = shot === 1 ? Math.sin(t * 95) * 3.5 : 0;

        drawBackground(ctx, w, h, mode, t, shot);
        drawRoad(ctx, w, h, mode, t, shot);
        drawSubjectShadow(ctx, w, h, scale * .85, mode);

        ctx.save(); ctx.translate(w / 2 + xOffset + shake, h / 2 + yOffset); ctx.scale(scale, scale); ctx.translate(-w / 2, -h / 2);
        if (mask) {
          fctx.clearRect(0, 0, w, h);
          fctx.drawImage(sourceCanvas, dx, dy, dw, dh);
          fctx.globalCompositeOperation = 'destination-in';
          fctx.filter = 'blur(0.65px)'; fctx.drawImage(mask, dx, dy, dw, dh);
          fctx.filter = 'none'; fctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(foreground, 0, 0);
        } else {
          ctx.globalAlpha = .74; ctx.filter = 'brightness(.66) contrast(1.18) saturate(1.12)'; ctx.drawImage(sourceCanvas, dx, dy, dw, dh); ctx.filter = 'none'; ctx.globalAlpha = 1;
        }
        ctx.restore();

        drawAtmosphere(ctx, w, h, mode, t, shot);
        drawGrade(ctx, w, h, mode, t);

        if (shot === 1 && (mode === 'drone-chase' || /chase|pursuit|action|race/.test(String(prompt).toLowerCase()))) {
          ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, h * .46, w, 5);
        }
        ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.font = '700 42px Arial'; ctx.textAlign = 'center';
        const label = mode === 'mars' ? 'MARS // ORIGINAL CINEMATIC SCENE' : mode === 'neon-city' ? 'NIGHT CITY // ORIGINAL SCENE' : mode === 'drone-chase' ? 'DRONE PURSUIT // ORIGINAL SCENE' : mode === 'desert' ? 'DESERT RUN // ORIGINAL SCENE' : 'FUTURE WORLD // ORIGINAL SCENE';
        ctx.fillText(label, w / 2, h - 120); ctx.restore();

        onProgress?.(Math.round(t * 100));
        if (t >= 1) { resolve(); return; }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });

    recorder.stop();
    const output = await stopped;
    if (!output?.size) throw new Error('World scene renderer produced an empty video.');
    return output;
  } finally {
    if (!sourceUrl) { try { URL.revokeObjectURL(source.url); } catch {} }
  }
}
