export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context.');

      const stream = canvas.captureStream(30);
      const mimeTypes = ['video/mp4;codecs=h264','video/mp4','video/webm;codecs=vp8','video/webm'];
      const selectedType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = selectedType ? new MediaRecorder(stream, { mimeType: selectedType }) : new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      recorder.onerror = (event) => reject(event.error || new Error('Video recording failed.'));
      recorder.onstop = () => resolve(new Blob(chunks, { type: selectedType.includes('mp4') ? 'video/mp4' : 'video/webm' }));

      const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
      if (!cuts.length) {
        resolve(new Blob([], { type: selectedType.includes('mp4') ? 'video/mp4' : 'video/webm' }));
        return;
      }

      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      const ease = (value) => value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
      const findMedia = (cut) => {
        if (cut?.mediaId != null) {
          const found = mediaItems.find((item) => String(item.id) === String(cut.mediaId));
          if (found) return found;
        }
        const index = Number(cut?.mediaIndex);
        return Number.isInteger(index) ? mediaItems[index] || null : null;
      };

      const drawCover = (element, scale, offsetX, offsetY, grade) => {
        const sw = element.videoWidth || element.naturalWidth || 1080;
        const sh = element.videoHeight || element.naturalHeight || 1920;
        const sourceRatio = sw / sh;
        const canvasRatio = canvas.width / canvas.height;
        let width, height;
        if (sourceRatio > canvasRatio) {
          height = canvas.height * scale;
          width = height * sourceRatio;
        } else {
          width = canvas.width * scale;
          height = width / sourceRatio;
        }
        const x = (canvas.width - width) / 2 + offsetX;
        const y = (canvas.height - height) / 2 + offsetY;
        let filter = 'brightness(0.90) contrast(1.18) saturate(1.12)';
        const g = String(grade || '').toLowerCase();
        if (g.includes('natural') || g.includes('neutral')) filter = 'brightness(0.98) contrast(1.08) saturate(1.08)';
        if (g.includes('warm') || g.includes('golden')) filter = 'brightness(0.94) contrast(1.15) saturate(1.12) sepia(0.08)';
        if (g.includes('blue') || g.includes('moody')) filter = 'brightness(0.88) contrast(1.20) saturate(1.14) hue-rotate(-6deg)';
        ctx.save();
        ctx.filter = filter;
        ctx.drawImage(element, x, y, width, height);
        ctx.restore();
      };

      const drawEffects = (cut, progress) => {
        const motion = String(cut.motionStyle || 'static').toLowerCase();
        const eased = ease(progress);
        const intensity = clamp(Number(cut.motionIntensity) || 1, 0.35, 1.5);
        let scale = cut.stabilization ? 1.07 : 1.035;
        let offsetX = 0;
        let offsetY = 0;
        if (motion.includes('slow-push') || motion.includes('push') || motion === 'zoom') scale += eased * 0.105 * intensity;
        else if (motion.includes('slow-pull') || motion.includes('pull') || motion.includes('zoom-out')) scale += (1 - eased) * 0.105 * intensity;
        else if (motion.includes('pan-right')) { scale = Math.max(scale, 1.08); offsetX = (eased - 0.5) * canvas.width * 0.13 * intensity; }
        else if (motion.includes('pan-left')) { scale = Math.max(scale, 1.08); offsetX = (0.5 - eased) * canvas.width * 0.13 * intensity; }
        else if (motion.includes('tilt-up')) { scale = Math.max(scale, 1.08); offsetY = (0.5 - eased) * canvas.height * 0.08 * intensity; }
        else if (motion.includes('tilt-down')) { scale = Math.max(scale, 1.08); offsetY = (eased - 0.5) * canvas.height * 0.08 * intensity; }
        else if (motion.includes('cinematic')) scale += eased * 0.055 * intensity;
        return { scale: clamp(scale, 1.01, 1.22), offsetX, offsetY };
      };

      const drawOverlay = (cut, progress, first) => {
        const transition = String(cut.transition || 'hard-cut').toLowerCase();
        const p = clamp(progress, 0, 1);
        const length = Math.min(0.35, Math.max(0.12, Number(cut.duration || 2) * 0.18));
        const t = clamp(p / (length / Math.max(0.5, Number(cut.duration) || 2)), 0, 1);

        if (transition === 'fade-in' || transition === 'fade' || (first && transition === 'cinematic')) {
          ctx.save(); ctx.fillStyle = '#000'; ctx.globalAlpha = 1 - t; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
        } else if (transition === 'fade-out') {
          ctx.save(); ctx.fillStyle = '#000'; ctx.globalAlpha = t; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
        } else if (transition === 'flash-cut') {
          const flash = Math.max(0, 1 - Math.abs(t - 0.5) * 8);
          ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = flash * 0.82; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
        }

        const text = String(cut.text || '').trim();
        if (text) {
          const tin = clamp(Number(cut.textIn) || 0.12, 0, 0.8);
          const tout = clamp(Number(cut.textOut) || 0.88, tin + 0.05, 1);
          let alpha = p < tin ? p / tin : p > tout ? 1 - (p - tout) / Math.max(0.05, 1 - tout) : 1;
          ctx.save(); ctx.globalAlpha = clamp(alpha,0,1); ctx.fillStyle = '#fff'; ctx.font = '700 54px Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.shadowColor='rgba(0,0,0,0.92)'; ctx.shadowBlur=18; ctx.fillText(text.toUpperCase(), canvas.width/2, canvas.height-210); ctx.restore();
        }
      };

      recorder.start();

      const renderCut = async (index) => {
        if (index >= cuts.length) {
          if (recorder.state !== 'inactive') recorder.stop();
          return;
        }

        const cut = cuts[index] || {};
        const media = findMedia(cut);
        if (!media?.file) {
          console.warn('[RENDERER] Skipping cut with missing media', index, cut);
          await renderCut(index + 1);
          return;
        }

        const isVideo = String(media.type || '').startsWith('video');
        const element = isVideo ? document.createElement('video') : new Image();
        const url = URL.createObjectURL(media.file);
        const duration = clamp(Number(cut.duration) || 2, 0.5, 8);
        const speed = clamp(Number(cut.speed) || 1, 0.5, 1.5);

        try {
          if (isVideo) {
            element.src = url;
            element.muted = true;
            element.playsInline = true;
            element.preload = 'auto';
            await new Promise((resolveLoad, rejectLoad) => {
              const timeout = setTimeout(() => rejectLoad(new Error('Timed out loading source video.')), 10000);
              element.onloadedmetadata = () => { clearTimeout(timeout); resolveLoad(); };
              element.onerror = () => { clearTimeout(timeout); rejectLoad(new Error('Could not load source video.')); };
              element.load();
            });

            const requestedStart = Number(cut.startTime);
            if (Number.isFinite(requestedStart) && requestedStart >= 0) {
              const target = Math.min(requestedStart, Math.max(0, (element.duration || requestedStart) - 0.05));
              element.currentTime = target;
              await new Promise((resolveSeek) => {
                let finished = false;
                const finish = () => { if (finished) return; finished = true; clearTimeout(timer); element.removeEventListener('seeked', finish); resolveSeek(); };
                const timer = setTimeout(finish, 1000);
                element.addEventListener('seeked', finish, { once: true });
              });
            }
            element.playbackRate = speed;
            await element.play();
          } else {
            element.src = url;
            await new Promise((resolveLoad, rejectLoad) => {
              const timeout = setTimeout(() => rejectLoad(new Error('Timed out loading source image.')), 10000);
              element.onload = () => { clearTimeout(timeout); resolveLoad(); };
              element.onerror = () => { clearTimeout(timeout); rejectLoad(new Error('Could not load source image.')); };
            });
          }

          const started = performance.now();
          await new Promise((resolveCut) => {
            const tick = () => {
              const progress = clamp((performance.now() - started) / (duration * 1000), 0, 1);
              ctx.clearRect(0,0,canvas.width,canvas.height);
              ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
              const effects = drawEffects(cut, progress);
              drawCover(element, effects.scale, effects.offsetX, effects.offsetY, cut.colorGrade || plan.colorGrade);

              const grade = String(cut.colorGrade || plan.colorGrade || 'dark-cinematic').toLowerCase();
              if (grade.includes('dark') || grade.includes('moody') || grade.includes('blue')) {
                const v = ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*0.18,canvas.width/2,canvas.height/2,canvas.height*0.82);
                v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,0.48)');
                ctx.fillStyle=v; ctx.fillRect(0,0,canvas.width,canvas.height);
              }

              drawOverlay(cut, progress, index === 0);
              if (onProgress) onProgress(Math.round(((index + progress) / cuts.length) * 100));
              if (progress >= 1) { resolveCut(); return; }
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });

          if (isVideo) element.pause();
          URL.revokeObjectURL(url);
          await renderCut(index + 1);
        } catch (error) {
          console.error('[RENDERER] Cut failed:', index, error);
          try { URL.revokeObjectURL(url); } catch {}
          await renderCut(index + 1);
        }
      };

      renderCut(0).catch((error) => {
        try { if (recorder.state !== 'inactive') recorder.stop(); } catch {}
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}
