export async function renderProject(
  mediaItems,
  plan,
  onProgress
) {
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
        mimeTypes.find((type) =>
          MediaRecorder.isTypeSupported(type)
        ) || '';

      const recorder = selectedType
        ? new MediaRecorder(stream, {
            mimeType: selectedType
          })
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

      const cuts = Array.isArray(plan?.cuts)
        ? plan.cuts
        : [];

      if (cuts.length === 0) {
        recorder.stop();
        return;
      }

      let currentCutIndex = 0;

      const findMedia = (cut) => {
        if (!cut) return null;

        if (
          cut.mediaId !== undefined &&
          cut.mediaId !== null
        ) {
          const found = mediaItems.find(
            (item) =>
              String(item.id) === String(cut.mediaId)
          );

          if (found) return found;
        }

        if (
          cut.mediaIndex !== undefined &&
          cut.mediaIndex !== null
        ) {
          const index = Number(cut.mediaIndex);

          if (mediaItems[index]) {
            return mediaItems[index];
          }
        }

        return null;
      };

      const easeInOut = (value) => {
        return value < 0.5
          ? 2 * value * value
          : 1 -
              Math.pow(-2 * value + 2, 2) /
                2;
      };

      const drawCover = (
        element,
        scale = 1,
        offsetX = 0,
        offsetY = 0,
        opacity = 1,
        brightness = 1
      ) => {
        const sourceWidth =
          element.videoWidth ||
          element.naturalWidth ||
          1080;

        const sourceHeight =
          element.videoHeight ||
          element.naturalHeight ||
          1920;

        const sourceRatio =
          sourceWidth / sourceHeight;

        const canvasRatio =
          canvas.width / canvas.height;

        let width;
        let height;

        if (sourceRatio > canvasRatio) {
          height = canvas.height * scale;
          width = height * sourceRatio;
        } else {
          width = canvas.width * scale;
          height = width / sourceRatio;
        }

        const x =
          (canvas.width - width) / 2 + offsetX;

        const y =
          (canvas.height - height) / 2 + offsetY;

        ctx.save();

        ctx.globalAlpha = opacity;

        ctx.filter =
          `brightness(${brightness}) contrast(1.18) saturate(1.2)`;

        ctx.drawImage(
          element,
          x,
          y,
          width,
          height
        );

        ctx.restore();
      };

      const drawTransition = (
        type,
        progress
      ) => {
        const transition = String(
          type || 'hard-cut'
        ).toLowerCase();

        if (
          transition === 'fade-in' ||
          transition === 'fade'
        ) {
          ctx.fillStyle = '#000';

          ctx.globalAlpha = 1 - progress;

          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          ctx.globalAlpha = 1;

          return;
        }

        if (
          transition === 'fade-out'
        ) {
          ctx.fillStyle = '#000';

          ctx.globalAlpha = progress;

          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          ctx.globalAlpha = 1;

          return;
        }

        if (
          transition === 'dip-black'
        ) {
          const amount =
            progress < 0.5
              ? progress * 2
              : (1 - progress) * 2;

          ctx.fillStyle = '#000';

          ctx.globalAlpha = 1 - amount;

          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          ctx.globalAlpha = 1;

          return;
        }

        if (
          transition === 'flash-cut'
        ) {
          const flash =
            Math.max(
              0,
              1 -
                Math.abs(
                  progress - 0.5
                ) *
                  8
            );

          ctx.fillStyle = '#fff';

          ctx.globalAlpha = flash * 0.85;

          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          ctx.globalAlpha = 1;

          return;
        }
      };

      const renderCut = async () => {
        if (
          currentCutIndex >=
          cuts.length
        ) {
          if (
            recorder.state !==
            'inactive'
          ) {
            recorder.stop();
          }

          return;
        }

        const cut =
          cuts[currentCutIndex];

        const media =
          findMedia(cut);

        if (!media || !media.file) {
          currentCutIndex++;

          renderCut();

          return;
        }

        const isVideo =
          typeof media.type === 'string' &&
          media.type.startsWith('video');

        const element = isVideo
          ? document.createElement('video')
          : new Image();

        const fileUrl =
          URL.createObjectURL(
            media.file
          );

        const duration =
          Math.max(
            0.5,
            Math.min(
              6,
              Number(cut.duration) || 2
            )
          );

        const speed =
          Math.max(
            0.5,
            Math.min(
              1.5,
              Number(cut.speed) || 1
            )
          );

        const transition =
          String(
            cut.transition ||
              'hard-cut'
          ).toLowerCase();

        const motion =
          String(
            cut.motionStyle ||
              'static'
          ).toLowerCase();

        try {
          /*
           * Load media.
           */

          if (isVideo) {
            element.src = fileUrl;
            element.muted = true;
            element.playsInline = true;
            element.preload = 'auto';

            await new Promise(
              (resolveLoad) => {
                let done = false;

                const finish = () => {
                  if (done) return;

                  done = true;

                  resolveLoad();
                };

                const timeout =
                  setTimeout(
                    finish,
                    8000
                  );

                element.onloadeddata =
                  () => {
                    clearTimeout(
                      timeout
                    );

                    finish();
                  };

                element.oncanplay =
                  () => {
                    clearTimeout(
                      timeout
                    );

                    finish();
                  };

                element.onerror =
                  () => {
                    clearTimeout(
                      timeout
                    );

                    finish();
                  };

                element.load();
              }
            );

            /*
             * Start from the beginning
             * unless AI later supplies
             * an exact start time.
             */

            const startTime =
              Number(
                cut.startTime
              );

            if (
              Number.isFinite(
                startTime
              ) &&
              startTime >= 0
            ) {
              element.currentTime =
                Math.min(
                  startTime,
                  Math.max(
                    0,
                    element.duration -
                      0.05
                  )
                );
            }

            element.playbackRate =
              speed;

            await element
              .play()
              .catch(() => {});
          } else {
            element.src = fileUrl;

            await new Promise(
              (resolveLoad) => {
                let done = false;

                const finish = () => {
                  if (done) return;

                  done = true;

                  resolveLoad();
                };

                const timeout =
                  setTimeout(
                    finish,
                    8000
                  );

                element.onload =
                  () => {
                    clearTimeout(
                      timeout
                    );

                    finish();
                  };

                element.onerror =
                  () => {
                    clearTimeout(
                      timeout
                    );

                    finish();
                  };
              }
            );
          }

          const start =
            performance.now();

          const interval =
            setInterval(() => {
              const elapsed =
                performance.now() -
                start;

              const progress =
                Math.min(
                  1,
                  elapsed /
                    (duration * 1000)
                );

              const eased =
                easeInOut(progress);

              /*
               * Clear.
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
               * Cinematic motion.
               */

              let scale = 1.03;

              let offsetX = 0;
              let offsetY = 0;

              if (
                motion.includes(
                  'slow-push'
                ) ||
                motion.includes(
                  'push'
                ) ||
                transition.includes(
                  'zoom'
                )
              ) {
                scale =
                  1.02 +
                  eased * 0.12;
              }

              else if (
                motion.includes(
                  'slow-pull'
                ) ||
                motion.includes(
                  'pull'
                ) ||
                transition.includes(
                  'zoom-out'
                )
              ) {
                scale =
                  1.14 -
                  eased * 0.11;
              }

              else if (
                motion.includes(
                  'pan-right'
                )
              ) {
                scale = 1.1;

                offsetX =
                  (eased - 0.5) *
                  canvas.width *
                  0.16;
              }

              else if (
                motion.includes(
                  'pan-left'
                )
              ) {
                scale = 1.1;

                offsetX =
                  (0.5 - eased) *
                  canvas.width *
                  0.16;
              }

              else if (
                motion.includes(
                  'tilt-up'
                )
              ) {
                scale = 1.1;

                offsetY =
                  (0.5 - eased) *
                  canvas.height *
                  0.1;
              }

              else if (
                motion.includes(
                  'tilt-down'
                )
              ) {
                scale = 1.1;

                offsetY =
                  (eased - 0.5) *
                  canvas.height *
                  0.1;
              }

              /*
               * Draw footage.
               */

              if (
                isVideo
                  ? element.readyState >=
                    2
                  : element.complete
              ) {
                drawCover(
                  element,
                  scale,
                  offsetX,
                  offsetY,
                  1,
                  0.88
                );
              }

              /*
               * Vignette.
               */

              const vignette =
                ctx.createRadialGradient(
                  canvas.width / 2,
                  canvas.height / 2,
                  canvas.height *
                    0.2,
                  canvas.width / 2,
                  canvas.height / 2,
                  canvas.height *
                    0.8
                );

              vignette.addColorStop(
                0,
                'rgba(0,0,0,0)'
              );

              vignette.addColorStop(
                1,
                'rgba(0,0,0,0.55)'
              );

              ctx.fillStyle =
                vignette;

              ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
              );

              /*
               * Transition.
               */

              const transitionLength =
                Math.min(
                  0.25,
                  duration / 3
                );

              if (
                transition !==
                  'hard-cut' &&
                progress <
                  transitionLength /
                    duration
              ) {
                drawTransition(
                  transition,
                  progress /
                    (transitionLength /
                      duration)
                );
              }

              /*
               * Text.
               */

              const text =
                cut.text ||
                '';

              if (text) {
                const textProgress =
                  Math.min(
                    1,
                    progress * 4
                  );

                ctx.save();

                ctx.globalAlpha =
                  textProgress;

                ctx.fillStyle =
                  '#fff';

                ctx.font =
                  'bold 54px Arial, sans-serif';

                ctx.textAlign =
                  'center';

                ctx.textBaseline =
                  'middle';

                ctx.shadowColor =
                  'rgba(0,0,0,0.9)';

                ctx.shadowBlur = 18;

                ctx.fillText(
                  String(
                    text
                  ).toUpperCase(),
                  canvas.width / 2,
                  canvas.height -
                    210
                );

                ctx.restore();
              }

              /*
               * Progress.
               */

              if (onProgress) {
                onProgress(
                  Math.round(
                    (
                      (currentCutIndex +
                        progress) /
                      cuts.length
                    ) *
                      100
                  )
                );
              }

              /*
               * End shot.
               */

              if (
                progress >= 1
              ) {
                clearInterval(
                  interval
                );

                if (isVideo) {
                  try {
                    element.pause();
                  } catch {}
                }

                try {
                  URL.revokeObjectURL(
                    fileUrl
                  );
                } catch {}

                currentCutIndex++;

                renderCut();
              }
            }, 33);
        } catch (error) {
          console.error(
            'Render cut error:',
            error
          );

          try {
            URL.revokeObjectURL(
              fileUrl
            );
          } catch {}

          currentCutIndex++;

          renderCut();
        }
      };

      renderCut();
    } catch (error) {
      reject(error);
    }
  });
}
