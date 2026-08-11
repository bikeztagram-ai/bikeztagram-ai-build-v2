export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      const canvasStream = canvas.captureStream(30);
      
      // Safely extract audio tracks if available
      let combinedStream = new MediaStream();
      canvasStream.getTracks().forEach((track) => combinedStream.addTrack(track));

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      
      const audioTracks = dest.stream.getAudioTracks();
      if (audioTracks && audioTracks.length > 0) {
        combinedStream.addTrack(audioTracks[0]);
      }

      let recorder;
      try {
        recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9' });
      } catch (e) {
        recorder = new MediaRecorder(combinedStream);
      }

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
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
          // Process Image
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
