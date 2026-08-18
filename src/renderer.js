/* BIKEZTAGRAM AI — stable renderer
 * Controlled change from the protected mainline renderer:
 * seek once per cut, then play normally while the canvas samples live frames.
 * This avoids repeated currentTime seeking that caused shaky/stalled renders.
 */
export async function renderProject(mediaItems, plan, onProgress) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context.');

  const stream = canvas.captureStream(30);
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=h264', 'video/mp4'];
  const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];
  let stopped = false;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const ease = (v) => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
  const cuts = Array.isArray(plan?.cuts) ? plan.cuts : Array.isArray(plan?.scenes) ? plan.scenes.map((s, i) => ({
    mediaIndex: s.mediaIndex ?? 0,
    mediaId: s.mediaId,
    startTime: Number(s.startTime) || 0,
    duration: Number(s.duration) || 2,
    purpose: s.purpose || 'cinematic-beat',
    transition: s.transitionIn || (i ? 'hard-cut' : 'fade-in'),
    motionStyle: s.motionStyle || 'static',
    motionIntensity: Number(s.motionIntensity) || 0.65,
    speed: Number(s.speed) || 1,
    speedEnd: Number(s.speedEnd ?? s.speed) || Number(s.speed) || 1,
    colorGrade: s.colorGrade || plan.colorGrade || 'cinematic',
    text: s.text || '',
  })) : [];
  if (!cuts.length) throw new Error('AI edit plan contains no cuts.');

  const mediaFor = (cut) => {
    if (cut.mediaId != null) {
      const found = mediaItems.find((item) => String(item.id) === String(cut.mediaId));
      if (found) return found;
    }
    const index = Number(cut.mediaIndex);
    return Number.isInteger(index) ? mediaItems[index] || null : null;
  };

  const sourceFor = (media) => media?.sourceUrl
    ? { url: media.sourceUrl, revoke: false, remote: true }
    : media?.file ? { url: URL.createObjectURL(media.file), revoke: true, remote: false } : null;

  const filterFor = (grade) => {
    const g = String(grade || '').toLowerCase();
    if (g.includes('warm') || g.includes('golden')) return 'brightness(.95) contrast(1.14) saturate(1.12) sepia(.06)';
    if (g.includes('blue') || g.includes('moody') || g.includes('dark')) return 'brightness(.90) contrast(1.18) saturate(1.12) hue-rotate(-5deg)';
    if (g.includes('vivid') || g.includes('energetic')) return 'brightness(.96) contrast(1.18) saturate(1.22)';
    if (g.includes('natural') || g.includes('neutral')) return 'brightness(.99) contrast(1.05) saturate(1.04)';
    return 'brightness(.94) contrast(1.12) saturate(1.08)';
  };

  const transformFor = (cut, p) => {
    const style = String(cut.motionStyle || 'static').toLowerCase();
    const intensity = clamp(Number(cut.motionIntensity) || 0.65, 0, 1.5);
    const e = ease(p);
    let scale = 1.035, x = 0, y = 0;
    if (style === 'slow-push') scale += e * .085 * intensity;
    else if (style === 'slow-pull') scale += (1 - e) * .085 * intensity;
    else if (style === 'pan-left') { scale = 1.08; x = (.5 - e) * canvas.width * .10 * intensity; }
    else if (style === 'pan-right') { scale = 1.08; x = (e - .5) * canvas.width * .10 * intensity; }
    else if (style === 'tilt-up') { scale = 1.08; y = (.5 - e) * canvas.height * .07 * intensity; }
    else if (style === 'tilt-down') { scale = 1.08; y = (e - .5) * canvas.height * .07 * intensity; }
    return { scale: clamp(scale, 1.02, 1.18), x, y };
  };

  const drawVideo = (video, cut, p) => {
    const sw = video.videoWidth, sh = video.videoHeight;
    if (!sw || !sh) throw new Error('Source video has no decoded dimensions.');
    const ratio = sw / sh, target = canvas.width / canvas.height;
    const t = transformFor(cut, p);
    let width, height;
    if (ratio > target) { height = canvas.height * t.scale; width = height * ratio; }
    else { width = canvas.width * t.scale; height = width / ratio; }
    const x = (canvas.width - width) / 2 + t.x;
    const y = (canvas.height - height) / 2 + t.y;
    ctx.save();
    ctx.filter = filterFor(cut.colorGrade || plan.colorGrade);
    ctx.drawImage(video, x, y, width, height);
    ctx.restore();
  };

  const overlays = (cut, p, index) => {
    const prompt = String(plan?.creativePrompt || '').toLowerCase();
    const purpose = String(cut?.purpose || '').toLowerCase();
    if (plan?.style || /cinematic|film|trailer|commercial/.test(prompt)) {
      const v = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*.22, canvas.width/2, canvas.height/2, canvas.height*.78);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(.72, 'rgba(0,0,0,.06)');
      v.addColorStop(1, 'rgba(0,0,0,.52)');
      ctx.save(); ctx.fillStyle = v; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
    }
    if (/trailer|film|cinematic|commercial/.test(prompt)) {
      const bar = Math.round(canvas.height * .035);
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.9)';
      ctx.fillRect(0, 0, canvas.width, bar); ctx.fillRect(0, canvas.height-bar, canvas.width, bar); ctx.restore();
    }
    if (index === 0 && cut.transition === 'fade-in') {
      ctx.save(); ctx.fillStyle = '#000'; ctx.globalAlpha = 1 - clamp(p/.25, 0, 1); ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
    }
    if (cut.transition === 'flash-cut') {
      ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = Math.max(0, 1 - Math.abs(p-.5)*8) * .35; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
    }
    if (cut.transition === 'dip-black' && Math.abs(p-.5) < .12) {
      ctx.save(); ctx.fillStyle = '#000'; ctx.globalAlpha = ((.12-Math.abs(p-.5))/.12)*.9; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
    }
    const text = String(cut?.text || '').trim();
    if (text) {
      ctx.save(); ctx.globalAlpha = Math.min(clamp(p/.12,0,1), clamp((1-p)/.12,0,1)); ctx.fillStyle = '#fff';
      ctx.font = '800 52px Arial,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,.95)'; ctx.shadowBlur = 18;
      ctx.fillText(text.toUpperCase(), canvas.width/2, canvas.height-220); ctx.restore();
    }
    if (/action|chase|speed|impact|race|energetic/.test(`${purpose} ${prompt}`)) {
      ctx.save(); ctx.globalAlpha = .07 * Math.sin(p*Math.PI); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      for (let i=0;i<5;i++){const y=canvas.height*(.22+i*.12);ctx.beginPath();ctx.moveTo(canvas.width*.12,y);ctx.lineTo(canvas.width*.88,y);ctx.stroke();}
      ctx.restore();
    }
  };

  const loadVideo = async (video, source) => {
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = source.remote ? 'anonymous' : '';
    video.src = source.url;
    video.load();
    await new Promise((resolve, reject) => {
      let doneFlag = false;
      const timer = setTimeout(() => finish(new Error('Timed out loading source video.')), 15000);
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', ready);
        video.removeEventListener('loadeddata', ready);
        video.removeEventListener('canplay', ready);
        video.removeEventListener('error', failed);
      };
      const finish = (error) => { if (doneFlag) return; doneFlag = true; cleanup(); error ? reject(error) : resolve(); };
      const ready = () => { if (video.videoWidth && video.videoHeight && Number.isFinite(video.duration)) finish(); };
      const failed = () => finish(new Error(`Could not decode source video. MediaError code=${video.error?.code ?? 'unknown'}.`));
      video.addEventListener('loadedmetadata', ready);
      video.addEventListener('loadeddata', ready);
      video.addEventListener('canplay', ready);
      video.addEventListener('error', failed);
    });
  };

  recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };

  const output = await new Promise((resolve, reject) => {
    recorder.onstop = () => {
      if (stopped) return;
      stopped = true;
      if (!chunks.length) return reject(new Error(`MediaRecorder produced no video data. Codec: ${mimeType || 'browser default'}.`));
      resolve(new Blob(chunks, { type: chunks[0]?.type || mimeType || 'video/webm' }));
    };
    recorder.onerror = (event) => reject(event.error || new Error('Video recording failed.'));

    (async () => {
      try {
        recorder.start(1000);
        for (let index = 0; index < cuts.length; index += 1) {
          const cut = cuts[index];
          const media = mediaFor(cut);
          if (!media) throw new Error(`Cut ${index+1} references missing media.`);
          const source = sourceFor(media);
          if (!source) throw new Error(`Cut ${index+1} has no usable source file or Blob URL.`);
          const video = document.createElement('video');
          let fallback = null;
          try {
            try { await loadVideo(video, source); }
            catch (error) {
              if (source.remote && media.file) {
                fallback = { url: URL.createObjectURL(media.file), revoke: true, remote: false };
                await loadVideo(video, fallback);
              } else throw error;
            }
            const start = clamp(Number(cut.startTime) || 0, 0, Math.max(0, video.duration-.05));
            const duration = clamp(Number(cut.duration) || 2, .5, 4);
            const speedA = clamp(Number(cut.speed) || 1, .5, 1.5);
            const speedB = clamp(Number(cut.speedEnd ?? speedA) || speedA, .5, 1.5);
            video.pause();
            video.currentTime = start;
            await new Promise((resolveSeek) => {
              let finished = false;
              const done = () => { if (finished) return; finished=true; clearTimeout(timer); video.removeEventListener('seeked', done); resolveSeek(); };
              const timer = setTimeout(done, 2000);
              video.addEventListener('seeked', done, { once: true });
            });
            video.playbackRate = speedA;
            try { await video.play(); }
            catch (error) { throw new Error(`Browser refused video playback: ${error?.message || String(error)}`); }
            const started = performance.now();
            await new Promise((resolveFrame) => {
              const frame = () => {
                const p = clamp((performance.now()-started)/(duration*1000), 0, 1);
                try { video.playbackRate = clamp(speedA + (speedB-speedA)*ease(p), .5, 1.5); } catch {}
                ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
                drawVideo(video, cut, p);
                overlays(cut, p, index);
                onProgress?.(Math.round(((index+p)/cuts.length)*100));
                if (p >= 1 || video.ended) return resolveFrame();
                requestAnimationFrame(frame);
              };
              requestAnimationFrame(frame);
            });
            video.pause();
          } finally {
            if (fallback?.revoke) URL.revokeObjectURL(fallback.url);
            if (source.revoke) URL.revokeObjectURL(source.url);
          }
        }
        if (recorder.state !== 'inactive') recorder.stop();
      } catch (error) {
        if (recorder.state !== 'inactive') { try { recorder.stop(); } catch {} }
        reject(error);
      }
    })();
  });

  return output;
}
