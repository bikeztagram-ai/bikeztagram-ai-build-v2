/*
 * BIKEZTAGRAM AI
 * Cinematic browser renderer
 *
 * CURRENT BASELINE:
 * - Keeps rendering entirely in the browser.
 * - Uses the Gemini-generated edit plan.
 * - Supports real motion, speed, transitions, colour grades,
 *   stabilization-style crop, and timed text.
 *
 * IMPORTANT:
 * This renderer does not upload files or call Gemini.
 * It only renders the already-created AI edit plan.
 */

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
        const outputType =
          selectedType.includes('mp4')
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

      /*
       * The final frame of the previous cut is copied here.
       * This allows the renderer to perform a genuine short
       * crossfade between cuts instead of merely fading to black.
       */
      const previousFrameCanvas =
        document.createElement('canvas');

      previousFrameCanvas.width = canvas.width;
      previousFrameCanvas.height = canvas.height;

      const previousFrameCtx =
        previousFrameCanvas.getContext('2d');

      let hasPreviousFrame = false;

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

      const clamp = (value, min, max) =>
        Math.max(min, Math.min(max, value));

      const easeInOut = (value) => {
        const t = clamp(value, 0, 1);

        return t < 0.5
          ? 2 * t * t
          : 1 -
              Math.pow(-2 * t + 2, 2) / 2;
      };

      const easeOut = (value) => {
        const t = clamp(value, 0, 1);
        return 1 - Math.pow(1 - t, 3);
      };

      const getColourFilter = (grade) => {
        const value =
          String(
            grade || 'dark-cinematic'
          ).toLowerCase();

        if (
          value.includes('natural') ||
          value.includes('neutral')
        ) {
          return 'brightness(0.98) contrast(1.08) saturate(1.08)';
        }

        if (
          value.includes('warm') ||
          value.includes('golden')
        ) {
          return 'brightness(0.94) contrast(1.15) saturate(1.12) sepia(0.08)';
        }

        if (
          value.includes('high') ||
          value.includes('contrast')
        ) {
          return 'brightness(0.90) contrast(1.28) saturate(1.16)';
        }

        if (
          value.includes('moody') ||
          value.includes('blue')
        ) {
          return 'brightness(0.88) contrast(1.20) saturate(1.14) hue-rotate(-6deg)';
        }

        return 'brightness(0.90) contrast(1.18) saturate(1.12)';
      };

      const drawCover = (
        element,
        {
          scale = 1,
          offsetX = 0,
          offsetY = 0,
          opacity = 1,
          brightness = 1,
          colorGrade = 'dark-cinematic'
        } = {}
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

        const baseFilter =
          getColourFilter(colorGrade);

        const finalBrightness =
          clamp(
            brightness,
            0.65,
            1.15
          );

        ctx.filter =
          `${baseFilter} brightness(${finalBrightness})`;

        ctx.drawImage(
          element,
          x,
          y,
          width,
          height
        );

        ctx.restore();
      };

      const drawGradeOverlay = (grade, progress) => {
        const value =
          String(
            grade || ''
          ).toLowerCase();

        /*
         * Very subtle cinematic tint. It is intentionally
         * restrained so the motorcycle's real colour remains
         * recognisable.
         */
        if (
          value.includes('moody') ||
          value.includes('blue') ||
          value.includes('dark')
        ) {
          const gradient =
            ctx.createLinearGradient(
              0,
              0,
              0,
              canvas.height
            );

          gradient.addColorStop(
            0,
            'rgba(8,18,32,0.12)'
          );

          gradient.addColorStop(
            0.55,
            'rgba(0,0,0,0)'
          );

          gradient.addColorStop(
            1,
            'rgba(0,0,0,0.22)'
          );

          ctx.save();
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = gradient;
          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );
          ctx.restore();
        }

        /*
         * Subtle cinematic vignette.
         */
        const vignette =
          ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            canvas.height * 0.18,
            canvas.width / 2,
            canvas.height / 2,
            canvas.height * 0.82
          );

        vignette.addColorStop(
          0,
          'rgba(0,0,0,0)'
        );

        vignette.addColorStop(
          0.68,
          'rgba(0,0,0,0.06)'
        );

        vignette.addColorStop(
          1,
          'rgba(0,0,0,0.52)'
        );

        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = vignette;
        ctx.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
        ctx.restore();
      };

      const drawTransition = (
        type,
        progress,
        isFirstCut
      ) => {
        const transition =
          String(
            type || 'hard-cut'
          ).toLowerCase();

        const p = clamp(progress, 0, 1);

        if (
          transition === 'crossfade' &&
          hasPreviousFrame
        ) {
          ctx.save();
          ctx.globalAlpha = 1 - p;
          ctx.drawImage(
            previousFrameCanvas,
            0,
            0
          );
          ctx.restore();

          return;
        }

        if (
          transition === 'fade-in' ||
          transition === 'fade' ||
          (isFirstCut && transition === 'cinematic')
        ) {
          ctx.save();
          ctx.fillStyle = '#000';
          ctx.globalAlpha = 1 - p;
          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );
          ctx.restore();

          return;
        }

        if (
          transition === 'fade-out'
        ) {
          ctx.save();
          ctx.fillStyle = '#000';
          ctx.globalAlpha = p;
          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );
          ctx.restore();

          return;
        }

        if (
          transition === 'dip-black'
        ) {
          const amount =
            p < 0.5
              ? p * 2
              : (1 - p) * 2;

          ctx.save();
          ctx.fillStyle = '#000';
          ctx.globalAlpha = 1 - amount;
          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );
          ctx.restore();

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
                  p - 0.5
                ) * 8
            );

          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = flash * 0.82;
          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );
          ctx.restore();

          return;
        }

        /*
         * Whip/slide transitions are implemented as a short
         * directional overlay. This keeps them safe and fast
         * in a browser-only renderer.
         */
        if (
          transition === 'whip-left' ||
          transition === 'slide-left'
        ) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.globalAlpha =
            Math.sin(p * Math.PI) * 0.7;
          ctx.fillRect(
            (1 - p) * canvas.width * 0.55,
            0,
            canvas.width * 0.45,
            canvas.height
          );
          ctx.restore();

          return;
        }

        if (
          transition === 'whip-right' ||
          transition === 'slide-right'
        ) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.globalAlpha =
            Math.sin(p * Math.PI) * 0.7;
          ctx.fillRect(
            -canvas.width * 0.45 +
              p * canvas.width * 0.55,
            0,
            canvas.width * 0.45,
            canvas.height
          );
          ctx.restore();
        }
      };

      const drawTextOverlay = (
        text,
        progress,
        textIn,
        textOut,
        style
      ) => {
        const value =
          String(text || '').trim();

        if (!value) return;

        const durationProgress =
          clamp(progress, 0, 1);

        const inPoint =
          clamp(
            Number(textIn) || 0.12,
            0,
            0.8
          );

        const outPoint =
          clamp(
            Number(textOut) || 0.88,
            inPoint + 0.05,
            1
          );

        let alpha = 1;

        if (durationProgress < inPoint) {
          alpha =
            durationProgress / inPoint;
        } else if (
          durationProgress > outPoint
        ) {
          alpha =
            1 -
            (
              durationProgress -
              outPoint
            ) /
              Math.max(
                0.05,
                1 - outPoint
              );
        }

        alpha =
          clamp(alpha, 0, 1);

        const rise =
          (1 - easeOut(alpha)) * 24;

        const textStyle =
          String(
            style || 'cinematic'
          ).toLowerCase();

        ctx.save();

        ctx.globalAlpha = alpha;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font =
          textStyle.includes('small')
            ? '600 38px Arial, sans-serif'
            : '700 54px Arial, sans-serif';

        ctx.shadowColor =
          'rgba(0,0,0,0.92)';

        ctx.shadowBlur = 18;

        ctx.shadowOffsetY = 4;

        ctx.fillStyle = '#fff';

        ctx.fillText(
          value.toUpperCase(),
          canvas.width / 2,
          canvas.height - 210 + rise
        );

        ctx.restore();
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
          cuts[currentCutIndex] || {};

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
              8,
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

        const colorGrade =
          String(
            cut.colorGrade ||
              plan.colorGrade ||
              'dark-cinematic'
          );

        const stabilization =
          Boolean(
            cut.stabilization ??
              cut.stabilize ??
              plan.stabilization
          );

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
                    10000
                  );

                element.onloadeddata =
                  () => {
                    clearTimeout(timeout);
                    finish();
                  };

                element.oncanplay =
                  () => {
                    clearTimeout(timeout);
                    finish();
                  };

                element.onerror =
                  () => {
                    clearTimeout(timeout);
                    finish();
                  };

                element.load();
              }
            );

            const startTime =
              Number(cut.startTime);

            if (
              Number.isFinite(startTime) &&
              startTime >= 0 &&
              Number.isFinite(element.duration)
            ) {
              element.currentTime =
                Math.min(
                  startTime,
                  Math.max(
                    0,
                    element.duration - 0.05
                  )
                );

              await new Promise(
                (resolveSeek) => {
                  const seekTimeout =
                    setTimeout(
                      resolveSeek,
                      120
                    );

                  const finishSeek = () => {
                    clearTimeout(
                      seekTimeout
                    );

                    element.removeEventListener(
                      'seeked',
                      finishSeek
                    );

                    resolveSeek();
                  };

                  element.addEventListener(
                    'seeked',
                    finishSeek,
                    { once: true }
                  );
                }
              );
            }

            element.playbackRate = speed;

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
                    10000
                  );

                element.onload =
                  () => {
                    clearTimeout(timeout);
                    finish();
                  };

                element.onerror =
                  () => {
                    clearTimeout(timeout);
                    finish();
                  };
              }
            );
          }

          const start =
            performance.now();

          const transitionLength =
            Math.min(
              0.35,
              Math.max(
                0.12,
                duration * 0.18
              )
            );

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
               * Clear and paint the cinematic black base.
               */
              ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
              );

              ctx.fillStyle = '#000';

              ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
              );

              /*
               * ------------------------------
               * AI-DIRECTED CAMERA MOTION
               * ------------------------------
               */

              let scale =
                stabilization
                  ? 1.07
                  : 1.035;

              let offsetX = 0;
              let offsetY = 0;

              const intensity =
                clamp(
                  Number(
                    cut.motionIntensity
                  ) || 1,
                  0.35,
                  1.5
                );

              if (
                motion.includes('slow-push') ||
                motion.includes('push') ||
                motion === 'zoom'
              ) {
                scale +=
                  eased *
                  0.105 *
                  intensity;
              } else if (
                motion.includes('slow-pull') ||
                motion.includes('pull') ||
                motion.includes('zoom-out')
              ) {
                scale +=
                  (1 - eased) *
                  0.105 *
                  intensity;
              } else if (
                motion.includes('pan-right')
              ) {
                scale = Math.max(
                  scale,
                  1.08
                );

                offsetX =
                  (eased - 0.5) *
                  canvas.width *
                  0.13 *
                  intensity;
              } else if (
                motion.includes('pan-left')
              ) {
                scale = Math.max(
                  scale,
                  1.08
                );

                offsetX =
                  (0.5 - eased) *
                  canvas.width *
                  0.13 *
                  intensity;
              } else if (
                motion.includes('tilt-up')
              ) {
                scale = Math.max(
                  scale,
                  1.08
                );

                offsetY =
                  (0.5 - eased) *
                  canvas.height *
                  0.08 *
                  intensity;
              } else if (
                motion.includes('tilt-down')
              ) {
                scale = Math.max(
                  scale,
                  1.08
                );

                offsetY =
                  (eased - 0.5) *
                  canvas.height *
                  0.08 *
                  intensity;
              } else if (
                motion.includes('pan')
              ) {
                scale = Math.max(
                  scale,
                  1.06
                );

                offsetX =
                  Math.sin(
                    eased * Math.PI
                  ) *
                  canvas.width *
                  0.035;
              } else if (
                motion.includes('cinematic')
              ) {
                scale +=
                  eased *
                  0.055 *
                  intensity;
              }

              /*
               * Keep the crop subtle. A motorcycle hero shot
               * should still show the complete machine.
               */
              scale =
                clamp(
                  scale,
                  1.01,
                  1.22
                );

              /*
               * ------------------------------
               * DRAW SOURCE
               * ------------------------------
               */

              if (
                isVideo
                  ? element.readyState >= 2
                  : element.complete
              ) {
                drawCover(
                  element,
                  {
                    scale,
                    offsetX,
                    offsetY,
                    opacity: 1,
                    brightness: 1,
                    colorGrade
                  }
                );
              }

              /*
               * ------------------------------
               * CINEMATIC GRADE / VIGNETTE
               * ------------------------------
               */

              drawGradeOverlay(
                colorGrade,
                progress
              );

              /*
               * ------------------------------
               * TRANSITION
               * ------------------------------
               */

              if (
                transition !== 'hard-cut' &&
                progress <
                  transitionLength / duration
              ) {
                drawTransition(
                  transition,
                  progress /
                    (
                      transitionLength /
                      duration
                    ),
                  currentCutIndex === 0
                );
              }

              /*
               * ------------------------------
               * TEXT
               * ------------------------------
               */

              drawTextOverlay(
                cut.text || '',
                progress,
                cut.textIn,
                cut.textOut,
                cut.textStyle
              );

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
               * ------------------------------
               * END OF CUT
               * ------------------------------
               */

              if (progress >= 1) {
                clearInterval(interval);

                if (isVideo) {
                  try {
                    element.pause();
                  } catch {}
                }

                /*
                 * Save the final rendered frame before moving
                 * to the next cut.
                 */
                try {
                  previousFrameCtx.clearRect(
                    0,
                    0,
                    previousFrameCanvas.width,
                    previousFrameCanvas.height
                  );

                  previousFrameCtx.drawImage(
                    canvas,
                    0,
                    0
                  );

                  hasPreviousFrame = true;
                } catch {
                  hasPreviousFrame = false;
                }

                try {
                  URL.revokeObjectURL(fileUrl);
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
            URL.revokeObjectURL(fileUrl);
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
