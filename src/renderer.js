export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(30);

      // Find mobile-compatible mimeType supported by the browser
      const mimeTypes = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp8',
        'video/webm'
      ];

      let selectedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

      let recorder;
      if (selectedType) {
        recorder = new MediaRecorder(stream, { mimeType: selectedType });
      } else {
        recorder = new MediaRecorder(stream);
      }

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const outputType = selectedType.includes('mp4') ? 'video/mp4' : 'video/webm';
        const blob = new Blob(chunks, { type: outputType });
        resolve(blob);
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
        const durationMs = (cut.duration || 2) * 1000;

        if (!media) {
          currentCutIndex++;
          processNextCut();
          return;
        }

        const isVideo = media.type.startsWith('video');

        if (isVideo) {
          const video = document.createElement('video');
          video.src = URL.createObjectURL(media.file);
          video.muted = true;
          video.playsInline = true;

          await new Promise((res) => {
            video.onloadeddata = () => res();
            video.onerror = () => res();
          });

          await video.play().catch(() => {});

          const startTime = Date.now();
          const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const overallProgress = Math.min(
              100,
              Math.round(((currentCutIndex + elapsed / durationMs) / totalCuts) * 100)
            );
            if (onProgress) onProgress(overallProgress);

            if (elapsed >= durationMs) {
              clearInterval(interval);
              video.pause();
              URL.revokeObjectURL(video.src);
              currentCutIndex++;
              processNextCut();
            }
          }, 33);
        } else {
          const img = new Image();
          img.src = URL.createObjectURL(media.file);

          await new Promise((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          });

          const startTime = Date.now();
          const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const overallProgress = Math.min(
              100,
              Math.round(((currentCutIndex + elapsed / durationMs) / totalCuts) * 100)
            );
            if (onProgress) onProgress(overallProgress);

            if (elapsed >= durationMs) {
              clearInterval(interval);
              URL.revokeObjectURL(img.src);
              currentCutIndex++;
              processNextCut();
            }
          }, 33);
        }
      };

      processNextCut();
    } catch (err) {
      reject(err);
    }
  });
}
