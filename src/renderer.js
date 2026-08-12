export async function renderProject(mediaItems, plan, onProgress) {
  return new Promise(async (resolve, reject) => {
    let recorder = null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not create canvas context.');
      }

      const stream = canvas.captureStream(30);

      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];

      const mimeType =
        mimeTypes.find((type) =>
          MediaRecorder.isTypeSupported(type)
        ) || '';

      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        reject(
          event.error ||
            new Error('Video recording failed.')
        );
      };

      recorder.onstop = () => {
        if (!chunks.length) {
          reject(
            new Error(
              'The video renderer produced no video data.'
            )
          );
          return;
        }

        resolve(
          new Blob(chunks, {
            type: mimeType || 'video/webm'
          })
        );
      };

      const cuts = Array.isArray(plan?.cuts)
        ? plan.cuts
        : [];

      if (!cuts.length) {
        throw new Error(
          'The AI edit plan contains no video cuts.'
        );
      }

      const findMedia = (cut) => {
        if (!cut) return null;

        if (
          cut.mediaId !== undefined &&
          cut.mediaId !== null
        ) {
          const match = mediaItems.find(
            (item) =>
              String(item.id) ===
              String(cut.mediaId)
          );

          if (match) return match;
        }

        const indexes = [
          cut.mediaIndex,
          cut.clipIndex,
          cut.index
        ];

        for (const value of indexes) {
          if (
            value !== undefined &&
            value !== null &&
            Number.isFinite(Number(value))
          ) {
            const index = Number(value);

            if (mediaItems[index]) {
              return mediaItems[index];
            }

            if (mediaItems[index - 1]) {
              return mediaItems[index - 1];
            }
          }
        }

        /*
         * If the AI didn't specify a media item,
         * fall back to the corresponding uploaded item.
         */
        const fallbackIndex =
          cuts.indexOf(cut);

        if (mediaItems[fallbackIndex]) {
          return mediaItems[fallbackIndex];
        }

        return null;
      };

      const waitForImage = (image) => {
        return new Promise((resolveImage, rejectImage) => {
          if (image.complete && image.naturalWidth > 0) {
            resolveImage();
            return;
          }

          const timeout = setTimeout(() => {
            rejectImage(
              new Error(
                'Image took too long to load.'
              )
            );
          }, 15000);

          image.onload = () => {
            clearTimeout(timeout);
            resolveImage();
          };

          image.onerror = () => {
            clearTimeout(timeout);
            rejectImage(
              new Error(
                'The uploaded image could not be loaded.'
              )
            );
          };
        });
      };

      const waitForVideo = (video) => {
        return new Promise((resolveVideo, rejectVideo) => {
          let resolved = false;

          const finish = () => {
            if (resolved) return;

            resolved = true;

            clearTimeout(timeout);

            if (
              video.videoWidth <= 0 ||
              video.videoHeight <= 0
            ) {
              rejectVideo(
                new Error(
                  'The uploaded video has no readable video dimensions.'
                )
              );
              return;
            }

            resolveVideo();
          };

          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;

              rejectVideo(
                new Error(
                  'The uploaded video could not be loaded.'
                )
              );
            }
          }, 20000);

          video.onloadedmetadata = finish;
          video.onloadeddata = finish;
          video.oncanplay = finish;

          video.onerror = () => {
            if (resolved) return;

            resolved = true;

            clearTimeout(timeout);

            rejectVideo(
              new Error(
                'The uploaded video could not be decoded by this browser.'
              )
            );
          };

          video.load();
        });
      };

      const drawMedia = (
        element,
        progress,
        transition,
        isVideo
      ) => {
        ctx.fillStyle = '#000';

        ctx.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        const effect =
          String(
            transition || 'zoom'
          ).toLowerCase();

        if (
          effect.includes('zoomout')
        ) {
          scale =
            1.08 -
            progress * 0.08;
        } else if (
          effect.includes('zoom')
        ) {
          scale =
            1 +
            progress * 0.08;
        } else if (
          effect.includes('pan') ||
          effect.includes('slide')
        ) {
          scale = 1.08;

          offsetX =
            (progress - 0.5) *
            canvas.width *
            0.12;
        } else if (
          effect.includes('up')
        ) {
          scale = 1.08;

          offsetY =
            (progress - 0.5) *
            canvas.height *
            0.08;
        } else if (
          effect.includes('down')
        ) {
          scale = 1.08;

          offsetY =
            (0.5 - progress) *
            canvas.height *
            0.08;
        }

        const sourceWidth =
          isVideo
            ? element.videoWidth
            : element.naturalWidth;

        const sourceHeight =
          isVideo
            ? element.videoHeight
            : element.naturalHeight;

        if (
          !sourceWidth ||
          !sourceHeight
        ) {
          throw new Error(
            'Media has invalid dimensions.'
          );
        }

        const sourceRatio =
          sourceWidth /
          sourceHeight;

        const canvasRatio =
          canvas.width /
          canvas.height;

        let drawWidth;
        let drawHeight;

        if (
          sourceRatio >
          canvasRatio
        ) {
          drawHeight =
            canvas.height *
            scale;

          drawWidth =
            drawHeight *
            sourceRatio;
        } else {
          drawWidth =
            canvas.width *
            scale;

          drawHeight =
            drawWidth /
            sourceRatio;
        }

        const drawX =
          (canvas.width -
            drawWidth) /
            2 +
          offsetX;

        const drawY =
          (canvas.height -
            drawHeight) /
            2 +
          offsetY;

        ctx.save();

        ctx.filter =
          'brightness(0.88) contrast(1.12) saturate(1.15)';

        ctx.drawImage(
          element,
          drawX,
          drawY,
          drawWidth,
          drawHeight
        );

        ctx.restore();

        /*
         * Vignette
         */
        const gradient =
          ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            canvas.height * 0.2,
            canvas.width / 2,
            canvas.height / 2,
            canvas.height * 0.85
          );

        gradient.addColorStop(
          0,
          'rgba(0,0,0,0)'
        );

        gradient.addColorStop(
          1,
          'rgba(0,0,0,0.4)'
        );

        ctx.fillStyle = gradient;

        ctx.fillRect(
          0,
          0,
          canvas
