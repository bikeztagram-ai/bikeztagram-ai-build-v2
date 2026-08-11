export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(30);

      const mimeTypes = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp8', 'video/webm'];
      let selectedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
      let recorder = selectedType ? new MediaRecorder(stream, { mimeType: selectedType }) : new MediaRecorder(stream);

      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const outputType = selectedType.includes('mp4') ? 'video/mp4' : 'video/webm';
        resolve(new Blob(chunks, { type: outputType }));
      };

      recorder.start();

      const cuts = plan.cuts || [];
      const totalCuts = cuts.length;
      let currentCutIndex = 0;

      if (totalCuts === 0) { recorder.stop(); return; }

      // Preload media
      const loadedElements = {};
      const preloadAll = async () => {
        for (let i = 0; i < mediaItems.length; i++) {
          const item = mediaItems[i];
          const isVideo = item.type.startsWith('video');
          const fileUrl = URL.createObjectURL(item.file);
          const el = isVideo ? document.createElement('video') : new Image();
          if (isVideo) {
            el.muted = true; el.playsInline = true; el.src = fileUrl;
            await new Promise(r => { el.onloadeddata = r; el.onerror = r; setTimeout(r, 2000); });
          } else {
            el.src = fileUrl;
            await new Promise(r => { el.onload = r; el.onerror = r; setTimeout(r, 1500); });
          }
          loadedElements[i] = { el, isVideo, url: fileUrl };
        }
      };

      preloadAll().then(() => {
        let prevObj = null;

        const processNextCut = async () => {
          if (currentCutIndex >= totalCuts) {
            recorder.stop();
            Object.values(loadedElements).forEach(obj => { try { URL.revokeObjectURL(obj.url); } catch(e){} });
            return;
          }

          const cut = cuts[currentCutIndex];
          const mediaIndex = cut.mediaIndex !== undefined ? cut.mediaIndex : currentCutIndex % mediaItems.length;
          const currObj = loadedElements[mediaIndex];
          const durationMs = (cut.duration || 2.5) * 1000;
          const transitionDuration = 500; // 0.5s transition

          if (!currObj) { currentCutIndex++; processNextCut(); return; }

          if (currObj.isVideo) {
            currObj.el.currentTime = 0;
            await currObj.el.play().catch(() => {});
          }

          const startTime = Date.now();

          const drawFrame = (obj, progress, alpha = 1.0, offsetX = 0) => {
            if (!obj) return;
            const el = obj.el;
            
            // Motion Styles
            let scale = 1.0;
            let xOffset = offsetX;
            let yOffset = 0;

            if (cut.motionStyle === 'zoom-in') scale = 1.0 + progress * 0.1;
            else if (cut.motionStyle === 'zoom-out') scale = 1.1 - progress * 0.1;
            else if (cut.motionStyle === 'pan-right') xOffset += (progress - 0.5) * 80;

            const w = canvas.width * scale;
            const h = canvas.height * scale;
            const x = (canvas.width - w) / 2 + xOffset;
            const y = (canvas.height - h) / 2 + yOffset;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Color Grade Application
            if (plan.colorGrade === 'dark-cinematic' || plan.colorGrade === 'moody-blue') {
              ctx.filter = 'brightness(0.7) contrast(1.35) saturate(1.45)';
            } else if (plan.colorGrade === 'vibrant-pop') {
              ctx.filter = 'brightness(0.9) contrast(1.2) saturate(1.8)';
            }

            ctx.drawImage(el, x, y, w, h);
            ctx.restore();
          };

          const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / durationMs);

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const transitionType = cut.transition || 'crossfade';

            if (prevObj && elapsed < transitionDuration) {
              const transAlpha = elapsed / transitionDuration;
              if (transitionType === 'whip-left') {
                const shift = (1 - transAlpha) * canvas.width;
                drawFrame(prevObj, 1.0, 1.0, -shift);
                drawFrame(currObj, progress, 1.0, canvas.width - shift);
              } else if (transitionType === 'flash-cut') {
                drawFrame(currObj, progress, 1.0);
                if (transAlpha < 0.3) {
                  ctx.fillStyle = `rgba(255,255,255,${0.8 - transAlpha * 2})`;
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
              } else {
                // Default Crossfade
                drawFrame(prevObj, 1.0, 1.0 - transAlpha);
                drawFrame(currObj, progress, transAlpha);
              }
            } else {
              drawFrame(currObj, progress, 1.0);
            }

            // Vignette Overlay
            const vignette = ctx.createRadialGradient(
              canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
              canvas.width / 2, canvas.height / 2, canvas.width * 0.8
            );
            vignette.addColorStop(0, 'rgba(0,0,0,0)');
            vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Letterbox Bars
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, 140);
            ctx.fillRect(0, canvas.height - 140, canvas.width, 140);

            // Dynamic Text Overlay
            if (plan.textOverlay) {
              ctx.fillStyle = '#ffffff';
              ctx.font = '900 52px sans-serif';
              ctx.textAlign = 'center';
              ctx.shadowColor = 'rgba(0,0,0,0.9)';
              ctx.shadowBlur = 16;
              ctx.fillText(plan.textOverlay.toUpperCase(), canvas.width / 2, canvas.height - 220);
              ctx.shadowBlur = 0;
            }

            const overallProgress = Math.min(100, Math.round(((currentCutIndex + progress) / totalCuts) * 100));
            if (onProgress) onProgress(overallProgress);

            if (elapsed >= durationMs) {
              clearInterval(interval);
              if (currObj.isVideo) currObj.el.pause();
              prevObj = currObj;
              currentCutIndex++;
              processNextCut();
            }
          }, 33);
        };

        processNextCut();
      });
    } catch (err) {
      reject(err);
    }
  });
}
