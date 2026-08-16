/* BIKEZTAGRAM AI — browser cinematic renderer
 * Controlled V5 change: extend the protected renderer with internal-editor
 * transition primitives (crossfade, dip-black and whip-style wipes) while
 * preserving the proven Blob-first source loading and MediaRecorder path.
 */

export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise((resolve, reject) => {
    try {
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
        'video/mp4'
      ];
      const selectedType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = selectedType ? new MediaRecorder(stream, { mimeType: selectedType }) : new MediaRecorder(stream);
      const chunks = [];
      let settled = false;

      const fail = (error) => {
        if (settled) return;
        settled = true;
        try { if (recorder.state !== 'inactive') recorder.stop(); } catch {}
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = (event) => fail(event.error || new Error('Video recording failed.'));
      recorder.onstop = () => {
        if (settled) return;
        settled = true;
        if (!chunks.length) {
          reject(new Error(`MediaRecorder produced no video data. Codec selected: ${selectedType || 'browser default'}.`));
          return;
        }
        const type = chunks[0]?.type || selectedType || 'video/webm';
        resolve(new Blob(chunks, { type }));
      };

      const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];
      if (!cuts.length) return fail(new Error('AI edit plan contains no cuts.'));

      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      const ease = (v) => v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;

      const findMedia = (cut) => {
        if (cut?.mediaId != null) {
          const found = mediaItems.find((item) => String(item.id) === String(cut.mediaId));
          if (found) return found;
        }
        const index = Number(cut?.mediaIndex);
        return Number.isInteger(index) ? mediaItems[index] || null : null;
      };

      const getSourceUrl = (media) => {
        if (media?.sourceUrl) return { url: media.sourceUrl, revoke: false, remote: true };
        if (media?.file) return { url: URL.createObjectURL(media.file), revoke: true, remote: false };
        return null;
      };

      const drawCover = (element, scale, offsetX, offsetY, grade) => {
        const sw = element.videoWidth || element.naturalWidth || 1080;
        const sh = element.videoHeight || element.naturalHeight || 1920;
        if (!sw || !sh) throw new Error('Source video has no decoded dimensions.');
        const sourceRatio = sw / sh;
        const canvasRatio = canvas.width / canvas.height;
        let width, height;
        if (sourceRatio > canvasRatio) { height = canvas.height * scale; width = height * sourceRatio; }
        else { width = canvas.width * scale; height = width / sourceRatio; }
        const x = (canvas.width - width) / 2 + offsetX;
        const y = (canvas.height - height) / 2 + offsetY;
        let filter = 'brightness(0.90) contrast(1.18) saturate(1.12)';
        const g = String(grade || '').toLowerCase();
        if (g.includes('natural') || g.includes('neutral')) filter = 'brightness(0.98) contrast(1.08) saturate(1.08)';
        if (g.includes('warm') || g.includes('golden')) filter = 'brightness(0.94) contrast(1.15) saturate(1.12) sepia(0.08)';
        if (g.includes('blue') || g.includes('moody')) filter = 'brightness(0.88) contrast(1.20) saturate(1.14) hue-rotate(-6deg)';
        ctx.save(); ctx.filter = filter; ctx.drawImage(element, x, y, width, height); ctx.restore();
      };

      const drawEffects = (cut, progress) => {
        const motion = String(cut.motionStyle || 'static').toLowerCase();
        const eased = ease(progress);
        const intensity = clamp(Number(cut.motionIntensity) || 1, 0.35, 1.5);
        let scale = cut.stabilization ? 1.07 : 1.035;
        let offsetX = 0, offsetY = 0;
        if (motion.includes('slow-push') || motion.includes('push') || motion === 'zoom') scale += eased * 0.105 * intensity;
        else if (motion.includes('slow-pull') || motion.includes('pull') || motion.includes('zoom-out')) scale += (1 - eased) * 0.105 * intensity;
        else if (motion.includes('pan-right')) { scale = Math.max(scale, 1.08); offsetX = (eased - 0.5) * canvas.width * 0.13 * intensity; }
        else if (motion.includes('pan-left')) { scale = Math.max(scale, 1.08); offsetX = (0.5 - eased) * canvas.width * 0.13 * intensity; }
        else if (motion.includes('tilt-up')) { scale = Math.max(scale, 1.08); offsetY = (0.5 - eased) * canvas.height * 0.08 * intensity; }
        else if (motion.includes('tilt-down')) { scale = Math.max(scale, 1.08); offsetY = (eased - 0.5) * canvas.height * 0.08 * intensity; }
        else if (motion.includes('cinematic')) scale += eased * 0.055 * intensity;
        return { scale: clamp(scale, 1.01, 1.22), offsetX, offsetY };
      };

      const drawTransition = (transition, progress, first) => {
        const name = String(transition || 'hard-cut').toLowerCase();
        const p = clamp(progress, 0, 1);
        const length = 0.22;
        const t = clamp(p / length, 0, 1);
        if (first && (name === 'fade-in' || name === 'fade' || name === 'cinematic')) {
          ctx.save(); ctx.fillStyle = '#000'; ctx.globalAlpha = 1 - t; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
        } else if (name === 'fade-out') {
          const fade = clamp((p - (1 - length)) / length, 0, 1);
          ctx.save(); ctx.fillStyle = '#000'; ctx.globalAlpha = fade; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
        } else if (name === 'flash-cut') {
          const flash = Math.max(0, 1 - Math.abs(p - 0.5) * 8);
          ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = flash * 0.82; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
        } else if (name === 'dip-black') {
          const dip = Math.max(0, 1 - Math.abs(p - 0.5) * 4);
          ctx.save(); ctx.fillStyle = '#000'; ctx.globalAlpha = dip * 0.88; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
        } else if (name === 'crossfade') {
          const fade = Math.max(0, 1 - p / 0.28);
          ctx.save(); ctx.fillStyle = '#000'; ctx.globalAlpha = fade * 0.18; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
        } else if (name === 'whip-left' || name === 'whip-right') {
          const direction = name === 'whip-left' ? -1 : 1;
          const edge = p < 0.5 ? p * 2 : (1 - p) * 2;
          const width = canvas.width * (0.08 + edge * 0.62);
          ctx.save(); ctx.fillStyle = '#000'; ctx.globalAlpha = 0.74; ctx.fillRect(direction < 0 ? canvas.width - width : 0, 0, width, canvas.height); ctx.restore();
        }
      };

      const drawOverlay = (cut, progress, first) => {
        const p = clamp(progress, 0, 1);
        const length = Math.min(0.35, Math.max(0.12, Number(cut.duration || 2) * 0.18));
        const t = clamp(p / (length / Math.max(0.5, Number(cut.duration) || 2)), 0, 1);
        drawTransition(cut.transition, p, first);
        const text = String(cut.text || '').trim();
        if (text) {
          const tin = clamp(Number(cut.textIn) || 0.12, 0, 0.8);
          const tout = clamp(Number(cut.textOut) || 0.88, tin + 0.05, 1);
          const alpha = clamp(p < tin ? p / tin : p > tout ? 1 - (p - tout) / Math.max(0.05, 1 - tout) : 1, 0, 1);
          ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#fff'; ctx.font = '700 54px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.92)'; ctx.shadowBlur = 18; ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height - 210); ctx.restore();
        }
      };

      recorder.start(1000);

      const loadVideo = async (element, source) => {
        element.muted = true;
        element.playsInline = true;
        element.preload = 'auto';
        element.crossOrigin = source.remote ? 'anonymous' : '';
        element.src = source.url;
        await new Promise((resolve, rejectLoad) => {
          let done = false;
          const timeout = setTimeout(() => finish(new Error('Timed out loading source video.')), 12000);
          const cleanup = () => { clearTimeout(timeout); element.removeEventListener('loadedmetadata', onMeta); element.removeEventListener('loadeddata', onData); element.removeEventListener('canplay', onCanPlay); element.removeEventListener('error', onError); };
          const finish = (error) => { if (done) return; done = true; cleanup(); error ? rejectLoad(error) : resolve(); };
          const onMeta = () => { if (element.videoWidth && element.videoHeight) finish(); };
          const onData = () => { if (element.videoWidth && element.videoHeight) finish(); };
          const onCanPlay = () => { if (element.videoWidth && element.videoHeight) finish(); };
          const onError = () => {
            const e = element.error;
            const code = e?.code ?? 'unknown';
            const message = e?.message || 'browser media decoder rejected the source';
            finish(new Error(`Could not decode source video. MediaError code=${code}; ${message}; readyState=${element.readyState}; networkState=${element.networkState}; canPlayType=${element.canPlayType('video/mp4') || 'no'}.`));
          };
          element.addEventListener('loadedmetadata', onMeta);
          element.addEventListener('loadeddata', onData);
          element.addEventListener('canplay', onCanPlay);
          element.addEventListener('error', onError);
          element.load();
        });
        if (!element.videoWidth || !element.videoHeight || !Number.isFinite(element.duration)) throw new Error(`Source video decoded incorrectly: ${element.videoWidth}x${element.videoHeight}, duration=${element.duration}.`);
        if ('mediaCapabilities' in navigator && navigator.mediaCapabilities.decodingInfo) {
          try {
            const info = await navigator.mediaCapabilities.decodingInfo({ type: 'file', video: { contentType: 'video/mp4', width: element.videoWidth, height: element.videoHeight, bitrate: 8000000, framerate: 30 } });
            if (info && info.supported === false) console.warn('[Bikeztagram] MediaCapabilities reports this MP4 is not supported on this device.', info);
          } catch (error) { console.warn('[Bikeztagram] MediaCapabilities preflight unavailable:', error); }
        }
      };

      const renderCut = async (index) => {
        if (index >= cuts.length) { if (recorder.state !== 'inactive') recorder.stop(); return; }
        const cut = cuts[index] || {};
        const media = findMedia(cut);
        if (!media) throw new Error(`Cut ${index + 1} references missing media.`);
        const isVideo = String(media.type || '').startsWith('video');
        const source = getSourceUrl(media);
        if (!source) throw new Error(`Cut ${index + 1} has no usable source file or Blob URL.`);
        const element = isVideo ? document.createElement('video') : new Image();
        const duration = clamp(Number(cut.duration) || 2, 0.5, 8);
        const speed = clamp(Number(cut.speed) || 1, 0.5, 1.5);
        try {
          if (isVideo) {
            try { await loadVideo(element, source); }
            catch (firstError) {
              if (source.remote && media.file) {
                console.warn('[Bikeztagram] Public Blob source failed; retrying local File source.', firstError);
                try { element.removeAttribute('src'); element.load(); } catch {}
                const fallback = { url: URL.createObjectURL(media.file), revoke: true, remote: false };
                try { await loadVideo(element, fallback); } finally { try { URL.revokeObjectURL(fallback.url); } catch {} }
              } else throw firstError;
            }
            const requestedStart = Number(cut.startTime);
            if (Number.isFinite(requestedStart) && requestedStart >= 0) {
              const target = Math.min(requestedStart, Math.max(0, element.duration - 0.05));
              element.currentTime = target;
              await new Promise((resolveSeek) => { let finished = false; const finish = () => { if (finished) return; finished = true; clearTimeout(timer); element.removeEventListener('seeked', finish); resolveSeek(); }; const timer = setTimeout(finish, 1800); element.addEventListener('seeked', finish, { once: true }); });
            }
            element.playbackRate = speed;
            await element.play();
          } else {
            element.src = source.url;
            await new Promise((resolveLoad, rejectLoad) => { const timeout = setTimeout(() => rejectLoad(new Error('Timed out loading source image.')), 10000); element.onload = () => { clearTimeout(timeout); resolveLoad(); }; element.onerror = () => { clearTimeout(timeout); rejectLoad(new Error('Could not load source image.')); }; });
          }

          const started = performance.now();
          await new Promise((resolveCut) => {
            const tick = () => {
              const progress = clamp((performance.now() - started) / (duration * 1000), 0, 1);
              ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
              const effects = drawEffects(cut, progress);
              drawCover(element, effects.scale, effects.offsetX, effects.offsetY, cut.colorGrade || plan.colorGrade);
              const grade = String(cut.colorGrade || plan.colorGrade || 'dark-cinematic').toLowerCase();
              if (grade.includes('dark') || grade.includes('moody') || grade.includes('blue')) { const v = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.18, canvas.width / 2, canvas.height / 2, canvas.height * 0.82); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.48)'); ctx.fillStyle = v; ctx.fillRect(0, 0, canvas.width, canvas.height); }
              drawOverlay(cut, progress, index === 0);
              onProgress?.(Math.round(((index + progress) / cuts.length) * 100));
              if (progress >= 1) { resolveCut(); return; }
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });
          if (isVideo) element.pause();
          if (source.revoke) URL.revokeObjectURL(source.url);
          await renderCut(index + 1);
        } catch (error) {
          if (source.revoke) { try { URL.revokeObjectURL(source.url); } catch {} }
          throw new Error(`Cut ${index + 1} failed: ${error?.message || String(error)}`);
        }
      };

      renderCut(0).catch(fail);
    } catch (error) { reject(error); }
  });
}
