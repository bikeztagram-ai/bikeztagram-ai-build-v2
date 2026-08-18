/* BIKEZTAGRAM AI — stable renderer v1
 * Deliberate execution change: uploaded video is decoded once per cut, seeked once,
 * then played normally while the canvas samples the live frame. This avoids the
 * per-animation-frame currentTime seeking that can cause shaking, stalls and black tails.
 */
export async function renderProject(mediaItems, plan, onProgress) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context.');

  const stream = canvas.captureStream(30);
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=h264',
    'video/mp4',
  ];
  const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];
  let stopped = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const ease = (value) => value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;

  let cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
  if (!cuts.length && Array.isArray(plan?.scenes)) {
    cuts = plan.scenes.map((scene, index) => ({
      mediaIndex: scene.mediaIndex ?? 0,
      mediaId: scene.mediaId,
      startTime: Number(scene.startTime) || 0,
      duration: Number(scene.duration) || 2,
      purpose: scene.purpose || 'cinematic-beat',
      transition: scene.transitionIn || (index === 0 ? 'fade-in' : 'hard-cut'),
      motionStyle: scene.motionStyle || 'static',
      motionIntensity: Number(scene.motionIntensity) || 0.65,
      speed: Number(scene.speed) || 1,
      speedEnd: Number(scene.speedEnd ?? scene.speed) || Number(scene.speed) || 1,
      colorGrade: scene.colorGrade || plan.colorGrade || 'cinematic',
      text: scene.text || '',
    }));
  }
  if (!cuts.length) throw new Error('AI edit plan contains no cuts.');

  const findMedia = (cut) => {
    if (cut?.mediaId != null) {
      const found = mediaItems.find((item) => String(item.id) === String(cut.mediaId));
      if (found) return found;
    }
    const index = Number(cut?.mediaIndex);
    return Number.isInteger(index) ? mediaItems[index] || null : null;
  };

  const sourceFor = (media) => media?.sourceUrl
    ? { url: media.sourceUrl, revoke: false, remote: true }
    : media?.file
      ? { url: URL.createObjectURL(media.file), revoke: true, remote: false }
      : null;

  const grade = (value) => {
    const g = String(value || '').toLowerCase();
    if (g.includes('warm') || g.includes('golden')) return 'brightness(.95) contrast(1.14) saturate(1.12) sepia(.06)';
    if (g.includes('blue') || g.includes('moody') || g.includes('dark')) return 'brightness(.90) contrast(1.18) saturate(1.12) hue-rotate(-5deg)';
    if (g.includes('vivid') || g.includes('energetic')) return 'brightness(.96) contrast(1.18) saturate(1.22)';
    if (g.includes('natural') || g.includes('neutral')) return 'brightness(.99) contrast(1.05) saturate(1.04)';
    return 'brightness(.94) contrast(1.12) saturate(1.08)';
  };

  const motion = (cut, progress) => {
    const style = String(cut.motionStyle || 'static').toLowerCase();
    const intensity = clamp(Number(cut.motionIntensity) || 0.65, 0, 1.5);
    const e = ease(progress);
    let scale = 1.035;
    let x = 0;
    let y = 0;

    if (style === 'slow-push') scale += e * 0.085 * intensity;
    else if (style === 'slow-pull') scale += (1 - e) * 0.085 * intensity;
    else if (style === 'pan-left') {
      scale = 1.08;
      x = (0.5 - e) * canvas.width * 0.10 * intensity;
    } else if (style === 'pan-right') {
      scale = 1.08;
      x = (e - 0.5) * canvas.width * 0.10 * intensity;
    } else if (style === 'tilt-up') {
      scale = 1.08;
      y = (0.5 - e) * canvas.height * 0.07 * intensity;
    } else if (style === 'tilt-down') {
      scale = 1.08;
      y = (e - 0.5) * canvas.height * 0.07 * intensity;
    }

    return { scale: clamp(scale, 1.02, 1.18), x, y };
  };

  const drawVideo = (video, transform, colorGrade) => {
    const sw = video.videoWidth;
    const sh = video.videoHeight;
    if (!sw || !sh) throw new Error('Source video has no decoded dimensions.');
    const ratio = sw / sh;
    const target = canvas.width / canvas.height;
    let width;
    let height;
    if (ratio > target) {
      height = canvas.height * transform.scale;
      width = height * ratio;
    } else {
      width = canvas.width * transform.scale;
      height = width / ratio;
    }
    const x = (canvas.width - width) / 2 + transform.x;
    const y = (canvas.height - height) / 2 + transform.y;
    ctx.save();
    ctx.filter = grade(colorGrade);
    ctx.drawImage(video, x, y, width, height);
    ctx.restore();
  };

  const finishFrame = (cut, progress) => {
    const prompt = String(plan?.creativePrompt || '').toLowerCase();
    const purpose = String(cut?.purpose || '').toLowerCase();
    if (plan?.style || /cinematic|film|trailer|commercial/.test(prompt)) {
      const vignette = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.22,
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.78,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.72, 'rgba(0,0,0,.06)');
      vignette.addColorStop(1, 'rgba(0,0,0,.52)');
      ctx.save();
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if (/trailer|film|cinematic|commercial/.test(prompt)) {
      const bar = Math.round(canvas.height * 0.035);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.90)';
      ctx.fillRect(0, 0, canvas.width, bar);
      ctx.fillRect(0, canvas.height - bar, canvas.width, bar);
      ctx.restore();
    }
    if (/action|chase|speed|impact|race|energetic/.test(`${purpose} ${prompt}`)) {
      ctx.save();
      ctx.globalAlpha = 0.08 * Math.sin(progress * Math.PI);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i += 1) {
        const y = canvas.height * (0.22 + i * 0.12);
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.12, y);
        ctx.lineTo(canvas.width * 0.88, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const textOverlay = (cut, progress) => {
    const text = String(cut?.text || '').trim();
    if (!text) return;
    const fadeIn = clamp(progress / 0.12, 0, 1);
    const fadeOut = clamp((1 - progress) / 0.12, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);
    ctx.fillStyle = '#fff';
    ctx.font = '800 52px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.95)';
    ctx.shadowBlur = 18;
    ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height - 220);
    ctx.restore();
  };

  const transition = (name, progress, first) => {
    const n = String(name || 'hard-cut').toLowerCase();
    if (first && (n === 'fade-in' || n === 'fade')) {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 1 - clamp(progress / 0.25, 0, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if (n === 'dip-black') {
      const edge = Math.abs(progress - 0.5);
      if (edge < 0.12) {
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.globalAlpha = (0.12 - edge) / 0.12 * 0.9;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
    if (n === 'flash-cut') {
      const alpha = Math.max(0, 1 - Math.abs(progress - 0.5) * 8) * 0.35;
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      let finished = false;
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('error', onError);
      };
      const done = (error) => {
        if (finished) return;
        finished = true;
        cleanup();
        error ? reject(error) : resolve();
      };
      const onReady = () => {
        if (video.videoWidth && video.videoHeight && Number.isFinite(video.duration)) done();
      };
      const onError = () => done(new Error(`Could not decode source video. MediaError code=${video.error?.code ?? 'unknown'}.`));
      const timer = setTimeout(() => done(new Error('Timed out loading source video.')), 15000);
      video.addEventListener('loadedmetadata', onReady);
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('canplay', onReady);
      video.addEventListener('error', onError);
    });
  };

  const waitForSeek = async (video) => {
    if (video.readyState >= 2) return;
    await new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        video.removeEventListener('canplay', done);
        resolve();
      };
      const timer = setTimeout(done, 1500);
      video.addEventListener('canplay', done, { once: true });
    });
  };

  const waitForPlay = async (video) => {
    try {
      await video.play();
    } catch (error) {
      throw new Error(`Browser refused video playback: ${error?.message || String(error)}`);
    }
  };

  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };
  recorder.onerror = (event) => {
    if (stopped) return;
    stopped = true;
    reject(event.error || new Error('Video recording failed.'));
  };

  const result = await new Promise(async (resolve, reject) => {
    recorder.onstop = () => {
      if (stopped) return;
      stopped = true;
      if (!chunks.length) {
        reject(new Error(`MediaRecorder produced no video data. Codec: ${mimeType || 'browser default'}.`));
        return;
      }
      resolve(new Blob(chunks, { type: chunks[0]?.type || mimeType || 'video/webm' }));
    };

    try {
      recorder.start(1000);
      for (let index = 0; index < cuts.length; index += 1) {
        const cut = cuts[index];
        const media = findMedia(cut);
        if (!media) throw new Error(`Cut ${index + 1} references missing media.`);
        const source = sourceFor(media);
        if (!source) throw new Error(`Cut ${index + 1} has no usable source file or Blob URL.`);
        const video = document.createElement('video');
        let fallbackSource = null;

        try {
          try {
            await loadVideo(video, source);
          } catch (firstError) {
            if (source.remote && media.file) {
              fallbackSource = { url: URL.createObjectURL(media.file), revoke: true, remote: false };
              await loadVideo(video, fallbackSource);
            } else {
              throw firstError;
            }
          }

          const clipStart = clamp(Number(cut.startTime) || 0, 0, Math.max(0, video.duration - 0.05));
          const outputDuration = clamp(Number(cut.duration) || 2, 0.5, 4);
          const speedStart = clamp(Number(cut.speed) || 1, 0.5, 1.5);
          const speedEnd = clamp(Number(cut.speedEnd ?? speedStart) || speedStart, 0.5, 1.5);

          video.pause();
          video.currentTime = clipStart;
          await new Promise((resolveSeek) => {
            let finished = false;
            const done = () => {
              if (finished) return;
              finished = true;
              clearTimeout(timer);
              video.removeEventListener('seeked', done);
              resolveSeek();
            };
            const timer = setTimeout(done, 2000);
            video.addEventListener('seeked', done, { once: true });
          });
          await waitForSeek(video);
          video.playbackRate = speedStart;
          await waitForPlay(video);

          const started = performance.now();
          await new Promise((resolveFrame) => {
            const frame = () => {
              const elapsed = (performance.now() - started) / 1000;
              const progress = clamp(elapsed / outputDuration, 0, 1);
              const rampSpeed = speedStart + (speedEnd - speedStart) * ease(progress);
              try { video.playbackRate = clamp(rampSpeed, 0.5, 1.5); } catch {}

              ctx.fillStyle = '#000';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              drawVideo(video, motion(cut, progress), cut.colorGrade || plan.colorGrade);
              finishFrame(cut, progress);
              transition(cut.transition, progress, index === 0);
              textOverlay(cut, progress);
              onProgress?.(Math.round(((index + progress) / cuts.length) * 100));

              if (progress >= 1 || video.ended) {
                resolveFrame();
                return;
              }
              requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
          });
          video.pause();
          if (fallbackSource?.revoke) URL.revokeObjectURL(fallbackSource.url);
          if (source.revoke) URL.revokeObjectURL(source.url);
        } catch (error) {
          if (fallbackSource?.revoke) URL.revokeObjectURL(fallbackSource.url);
          if (source.revoke) URL.revokeObjectURL(source.url);
          throw new Error(`Cut ${index + 1} failed: ${error?.message || String(error)}`);
        }
      }

      if (recorder.state !== 'inactive') recorder.stop();
    } catch (error) {
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch {}
      }
      reject(error);
    }
  });

  return result;
}
