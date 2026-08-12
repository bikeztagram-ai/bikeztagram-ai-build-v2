export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not create canvas context.'));
        return;
      }

      const stream = canvas.captureStream(30);

      const mimeTypes = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp8',
        'video/webm'
      ];

      const selectedType =
        mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = selectedType
        ? new MediaRecorder(stream, { mimeType: selectedType })
        : new MediaRecorder(stream);

      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        reject(event.error || new Error('Video recording failed.'));
      };

      recorder.onstop = () => {
        const outputType = selectedType.includes('mp4')
          ? 'video/mp4'
          : 'video/webm';

        resolve(
          new Blob(chunks, {
            type: outputType
          })
        );
      };

      recorder.start();

      const cuts = Array.isArray(plan?.cuts) ? plan.cuts : [];

      if (cuts.length === 0) {
        recorder.stop();
        return;
      }

      let currentCutIndex = 0;

      /*
       * The AI can identify media in two ways:
       *
       * 1. mediaId
       * 2. mediaIndex
       *
       * We support both so the renderer remains compatible
       * with different AI plans.
       */
      const findMediaForCut = (cut) => {
        if (!cut) return null;

        // Preferred: explicit mediaId
        if (cut.mediaId !== undefined && cut.mediaId !== null) {
          const byId = mediaItems.find(
            (item) => String(item.id) === String(cut.mediaId)
          );

          if (byId) return byId;
        }

        // AI plans may use mediaIndex instead
        if (
          cut.mediaIndex !== undefined &&
          cut.mediaIndex !== null &&
          Number.isFinite(Number(cut.mediaIndex))
        ) {
          const index = Number(cut.mediaIndex);

          // Support both zero-based and one-based indexes
          if (mediaItems[index]) {
            return mediaItems[index];
          }

          if (mediaItems[index - 1]) {
            return mediaItems[index - 1];
          }
        }

        // Some AI plans may call it clipIndex
        if (
          cut.clipIndex !== undefined &&
          cut.clipIndex !== null &&
          Number.isFinite(Number(cut.clipIndex))
        ) {
          const index = Number(cut.clipIndex);

          if (mediaItems[index]) {
            return mediaItems[index];
          }

          if (mediaItems[index - 1]) {
            return mediaItems[index - 1];
          }
        }

        return null;
      };

      const processNextCut = async () => {
        if (currentCutIndex >= cuts.length) {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
          return;
        }

        const cut = cuts[currentCutIndex];
        const media = findMediaForCut(cut);

        const durationSeconds = Number(cut?.duration) || 3;
        const durationMs = Math.max(500, durationSeconds * 1000);

        if (!media || !media.file) {
          console.warn(
            'Could not find media for AI cut:',
            cut
          );

          currentCutIndex++;
          processNextCut();
          return;
        }

        const isVideo =
          typeof media.type === 'string' &&
          media.type.startsWith('video');

        const fileUrl = URL.createObjectURL(media.file);

        const element = isVideo
          ? document.createElement('video')
          : new Image();

        try {
          /*
           * Load the source media.
           */
          if (isVideo) {
            element.muted = true;
            element.playsInline = true;
            element.autoplay = false;
            element.preload = 'auto';
            element.src = fileUrl;

            await new Promise((resolveLoad) => {
              let finished = false;

              const finish = () => {
                if (finished) return;
                finished = true;
                resolveLoad();
              };

              const timeout = setTimeout(finish, 5000);

              element.onloadeddata = () => {
                clearTimeout(timeout);
                finish();
              };

              element.oncanplay = () => {
                clearTimeout(timeout);
                finish();
              };

              element.onerror = () => {
                clearTimeout(timeout);
                finish();
              };

              element.load();
            });

            await element.play().catch(() => {});
          } else {
            element.src = fileUrl;

            await new Promise((resolveLoad) => {
              let finished = false;

              const finish = () => {
                if (finished) return;
                finished = true;
                resolveLoad();
              };

              const timeout = setTimeout(finish, 5000);

              element.onload = () => {
                clearTimeout(timeout);
                finish();
              };

              element.onerror = () => {
                clearTimeout(timeout);
                finish();
              };
            });
          }

          /*
           * Read AI-selected visual settings.
           */
          const transition =
            String(
              cut.transition ||
              cut.effect ||
              cut.motion ||
              'zoom'
            ).toLowerCase();

          const startTime = Date.now();

          const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;

            const progress = Math.min(
              1,
              elapsed / durationMs
            );

            /*
             * Clear the canvas.
             */
            ctx.clearRect(
              0,
              0,
              canvas.width,
              canvas.height
            );

            /*
             * Background.
             */
            ctx.fillStyle = '#000';
            ctx.fillRect(
              0,
              0,
              canvas.width,
              canvas.height
            );

            /*
             * AI-directed visual motion.
             */
            let scale = 1;

            let offsetX = 0;
            let offsetY = 0;

            if (
              transition.includes('zoom') ||
              transition.includes('push')
            ) {
              scale = 1 + progress * 0.08;
            } else if (transition.includes('zoomout')) {
              scale = 1.08 - progress * 0.08;
            } else if (
              transition.includes('pan') ||
              transition.includes('slide')
            ) {
              scale = 1.08;
              offsetX =
                (progress - 0.5) *
                canvas.width *
                0.12;
            } else if (transition.includes('up')) {
              scale = 1.08;
              offsetY =
                (progress - 0.5) *
                canvas.height *
                0.08;
            } else if (transition.includes('down')) {
              scale = 1.08;
              offsetY =
                (0.5 - progress) *
                canvas.height *
                0.08;
            }

            /*
             * Work out aspect-ratio preserving dimensions.
             */
            const sourceWidth =
              element.videoWidth ||
              element.naturalWidth ||
              canvas.width;

            const sourceHeight =
              element.videoHeight ||
              element.naturalHeight ||
              canvas.height;

            const sourceRatio =
              sourceWidth / sourceHeight;

            const canvasRatio =
              canvas.width / canvas.height;

            let drawWidth;
            let drawHeight;

            if (sourceRatio > canvasRatio) {
              drawHeight = canvas.height * scale;
              drawWidth =
                drawHeight * sourceRatio;
            } else {
              drawWidth = canvas.width * scale;
              drawHeight =
                drawWidth / sourceRatio;
            }

            const drawX =
              (canvas.width - drawWidth) / 2 +
              offsetX;

            const drawY =
              (canvas.height - drawHeight) / 2 +
              offsetY;

            /*
             * Cinematic image treatment.
             */
            ctx.save();

            ctx.filter =
              'brightness(0.82) contrast(1.18) saturate(1.2)';

            if (
              isVideo
                ? element.readyState >= 2
                : element.complete
            ) {
              ctx.drawImage(
                element,
                drawX,
                drawY,
                drawWidth,
                drawHeight
              );
            }

            ctx.restore();

            /*
             * Subtle cinematic vignette.
             */
            const gradient =
              ctx.createRadialGradient(
                canvas.width / 2,
                canvas.height / 2,
                canvas.height * 0.25,
                canvas.width / 2,
                canvas.height / 2,
                canvas.height * 0.8
              );

            gradient.addColorStop(
              0,
              'rgba(0,0,0,0)'
            );

            gradient.addColorStop(
              1,
              'rgba(0,0,0,0.45)'
            );

            ctx.fillStyle = gradient;

            ctx.fillRect(
              0,
              0,
              canvas.width,
              canvas.height
            );

            /*
             * Cinematic letterbox.
             */
            ctx.fillStyle = '#000';

            ctx.fillRect(
              0,
              0,
              canvas.width,
              110
            );

            ctx.fillRect(
              0,
              canvas.height - 110,
              canvas.width,
              110
            );

            /*
             * AI-generated text overlay.
             */
            const overlayText =
              cut.text ||
              cut.textOverlay ||
              plan.textOverlay ||
              '';

            if (overlayText) {
              ctx.save();

              ctx.fillStyle = '#fff';

              ctx.font =
                'bold 52px sans-serif';

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              ctx.shadowColor =
                'rgba(0,0,0,0.85)';

              ctx.shadowBlur = 14;

              ctx.fillText(
                String(overlayText).toUpperCase(),
                canvas.width / 2,
                canvas.height - 210
              );

              ctx.restore();
            }

            /*
             * Progress.
             */
            const overallProgress = Math.min(
              100,
              Math.round(
                ((currentCutIndex + progress) /
                  cuts.length) *
                  100
              )
            );

            if (onProgress) {
              onProgress(overallProgress);
            }

            /*
             * Finished this cut.
             */
            if (elapsed >= durationMs) {
              clearInterval(interval);

              if (isVideo) {
                try {
                  element.pause();
                } catch (error) {
                  console.warn(error);
                }
              }

              try {
                URL.revokeObjectURL(fileUrl);
              } catch (error) {
                console.warn(error);
              }

              currentCutIndex++;

              processNextCut();
            }
          }, 33);
        } catch (error) {
          console.error(
            'Error rendering cut:',
            error
          );

          try {
            URL.revokeObjectURL(fileUrl);
          } catch (revokeError) {
            console.warn(revokeError);
          }

          currentCutIndex++;

          processNextCut();
        }
      };

      processNextCut();
    } catch (error) {
      console.error(
        'Video renderer error:',
        error
      );

      reject(error);
    }
  });
}
