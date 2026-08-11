export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(30);

      const mimeTypes = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
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

      if (totalCuts === 0) {
        recorder.stop();
        return;
      }

      const processNextCut = async () => {
        if (currentCutIndex >= totalCuts) {
          recorder.stop();
          return;
        }

        const cut = cuts[currentCutIndex];
        const media = mediaItems.find((m) => m.id === cut.mediaId);
        const durationMs = (cut.duration || 3) * 1000;

        if (!media) {
          currentCutIndex++;
          processNextCut();
          return;
        }

        const isVideo = media.type.startsWith('video');
        const fileUrl = URL.createObjectURL(media.file);
        const element = isVideo ? document.createElement('video') : new Image();

        try {
          if (isVideo) {
            element.muted = true;
            element.playsInline = true;
            element.src = fileUrl;

            await new Promise((res) => {
              const timeout = setTimeout(res, 3000); // 3s fallback so it never hangs forever
              element.onloadeddata = () => { clearTimeout(timeout); res(); };
              element.onerror = () => { clearTimeout(timeout); res(); };
            });

            await element.play().catch(() => {});
          } else {
            element.src = fileUrl;
            await new Promise((res) => {
              const timeout = setTimeout(res, 2000);
              element.onload = () => { clearTimeout(timeout); res(); };
              element.onerror = () => { clearTimeout(timeout); res(); };
            });
          }

          const startTime = Date.now();
          const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / durationMs);

            // Apply Dark Moody Contrast Filter
            ctx.filter = 'brightness(0.75) contrast(1.25) saturate(1.35)';

            // Smooth Slow Zoom
            const scale = 1.0 + progress * 0.08;
            const w = canvas.width * scale;
            const h = canvas.height * scale;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;

            if (isVideo ? element.readyState >= 2 : element.complete) {
              ctx.drawImage(element, x, y, w, h);
            } else {
              ctx.fillStyle = '#111';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.filter = 'none';

            // Letterbox Bars
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, 140);
            ctx.fillRect(0, canvas.height - 140, canvas.width, 140);

            // Dynamic Text Overlay
            if (plan.textOverlay) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 52px sans-serif';
              ctx.textAlign = 'center';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
              ctx.shadowBlur = 12;
              ctx.fillText(plan.textOverlay.toUpperCase(), canvas.width / 2, canvas.height - 200);
              ctx.shadowBlur = 0;
            }

            const overallProgress = Math.min(100, Math.round(((currentCutIndex + progress) / totalCuts) * 100));
            if (onProgress) onProgress(overallProgress);

            if (elapsed >= durationMs) {
              clearInterval(interval);
              if (isVideo) element.pause();
              try { URL.revokeObjectURL(fileUrl); } catch (e) {}
              currentCutIndex++;
              processNextCut();
            }
          }, 33);
        } catch (err) {
          console.error(err);
          try { URL.revokeObjectURL(fileUrl); } catch (e) {}
          currentCutIndex++;
          processNextCut();
        }
      };

      processNextCut();
    } catch (err) {
      reject(err);
    }
  });
}
