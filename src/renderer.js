/*
 * BIKEZTAGRAM AI
 * Cinematic browser renderer
 *
 * WORKING PIPELINE BASELINE:
 * - Blob upload is handled elsewhere.
 * - Gemini analysis is handled elsewhere.
 * - This renderer only receives the already-created
 *   mediaItems and Gemini edit plan.
 *
 * IMPORTANT:
 * This renderer is deliberately defensive about video loading.
 * A failed/empty video element must never silently produce
 * a black render.
 */

export async function renderProject(
  mediaItems,
  plan,
  onProgress
) {
  return new Promise((resolve, reject) => {
    let finished = false;

    const fail = (error) => {
      if (finished) return;

      finished = true;

      console.error(
        'BIKEZTAGRAM renderer failed:',
        error
      );

      reject(
        error instanceof Error
          ? error
          : new Error(String(error))
      );
    };

    try {
      /*
       * -----------------------------------------------------
       * CANVAS
       * -----------------------------------------------------
       */

      const canvas =
        document.createElement('canvas');

      canvas.width = 1080;
      canvas.height = 1920;

      const ctx =
        canvas.getContext('2d', {
          alpha: false
        });

      if (!ctx) {
        fail(
          new Error(
            'Could not create canvas context.'
          )
        );

        return;
      }

      /*
       * -----------------------------------------------------
       * MEDIA RECORDER
       * -----------------------------------------------------
       */

      const stream =
        canvas.captureStream(30);

      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];

      const selectedType =
        mimeTypes.find(
          (type) =>
            typeof MediaRecorder !==
              'undefined' &&
            MediaRecorder.isTypeSupported(
              type
            )
        ) || '';

      let recorder;

      try {
        recorder = selectedType
          ? new MediaRecorder(
              stream,
              {
                mimeType:
                  selectedType
              }
            )
          : new MediaRecorder(
              stream
            );
      } catch (error) {
        fail(
          new Error(
            `Could not start video recorder: ${
              error?.message ||
              String(error)
            }`
          )
        );

        return;
      }

      const chunks = [];

      recorder.ondataavailable = (
        event
      ) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          chunks.push(
            event.data
          );
        }
      };

      recorder.onerror = (
        event
      ) => {
        fail(
          event?.error ||
            new Error(
              'Video recording failed.'
            )
        );
      };

      recorder.onstop = () => {
        if (finished) return;

        finished = true;

        const outputType =
          selectedType ||
          'video/webm';

        resolve(
          new Blob(
            chunks,
            {
              type:
                outputType
            }
          )
        );
      };

      /*
       * -----------------------------------------------------
       * PLAN
       * -----------------------------------------------------
       */

      const cuts =
        Array.isArray(
          plan?.cuts
        )
          ? plan.cuts
          : [];

      if (
        cuts.length === 0
      ) {
        fail(
          new Error(
            'The AI edit plan contains no cuts.'
          )
        );

        return;
      }

      /*
       * -----------------------------------------------------
       * HELPERS
       * -----------------------------------------------------
       */

      const clamp = (
        value,
        min,
        max
      ) =>
        Math.max(
          min,
          Math.min(
            max,
            value
          )
        );

      const easeInOut = (
        value
      ) => {
        const t =
          clamp(
            value,
            0,
            1
          );

        return t < 0.5
          ? 2 *
              t *
              t
          : 1 -
              Math.pow(
                -2 *
                    t +
                  2,
                2
              ) /
                2;
      };

      const easeOut = (
        value
      ) => {
        const t =
          clamp(
            value,
            0,
            1
          );

        return (
          1 -
          Math.pow(
            1 - t,
            3
          )
        );
      };

      /*
       * -----------------------------------------------------
       * FIND MEDIA
       * -----------------------------------------------------
       */

      const findMedia = (
        cut
      ) => {
        if (!cut) {
          return null;
        }

        if (
          cut.mediaId !==
            undefined &&
          cut.mediaId !==
            null
        ) {
          const found =
            mediaItems.find(
              (item) =>
                String(
                  item?.id
                ) ===
                String(
                  cut.mediaId
                )
            );

          if (found) {
            return found;
          }
        }

        if (
          cut.mediaIndex !==
            undefined &&
          cut.mediaIndex !==
            null
        ) {
          const index =
            Number(
              cut.mediaIndex
            );

          if (
            mediaItems[index]
          ) {
            return mediaItems[
              index
            ];
          }
        }

        /*
         * Fallback:
         * Gemini sometimes returns video-0/video-1 style IDs.
         */

        if (
          typeof cut.mediaId ===
          'string'
        ) {
          const match =
            cut.mediaId.match(
              /(\d+)$/
            );

          if (match) {
            const index =
              Number(
                match[1]
              );

            if (
              mediaItems[index]
            ) {
              return mediaItems[
                index
              ];
            }
          }
        }

        return null;
      };

      /*
       * -----------------------------------------------------
       * SOURCE RESOLUTION
       *
       * Supports:
       * - media.file
       * - media.blob
       * - media.url
       * - media.src
       * -----------------------------------------------------
       */

      const getSource = (
        media
      ) => {
        if (!media) {
          return null;
        }

        if (
          media.file instanceof
          Blob
        ) {
          return {
            src:
              URL.createObjectURL(
                media.file
              ),
            revoke: true
          };
        }

        if (
          media.blob instanceof
          Blob
        ) {
          return {
            src:
              URL.createObjectURL(
                media.blob
              ),
            revoke: true
          };
        }

        if (
          typeof media.url ===
          'string' &&
          media.url
        ) {
          return {
            src:
              media.url,
            revoke: false
          };
        }

        if (
          typeof media.src ===
          'string' &&
          media.src
        ) {
          return {
            src:
              media.src,
            revoke: false
          };
        }

        return null;
      };

      /*
       * -----------------------------------------------------
       * COLOUR
       * -----------------------------------------------------
       */

      const getColourFilter = (
        grade
      ) => {
        const value =
          String(
            grade ||
              'dark-cinematic'
          ).toLowerCase();

        if (
          value.includes(
            'natural'
          ) ||
          value.includes(
            'neutral'
          )
        ) {
          return (
            'brightness(0.98) ' +
            'contrast(1.08) ' +
            'saturate(1.08)'
          );
        }

        if (
          value.includes(
            'warm'
          ) ||
          value.includes(
            'golden'
          )
        ) {
          return (
            'brightness(0.94) ' +
            'contrast(1.15) ' +
            'saturate(1.12) ' +
            'sepia(0.08)'
          );
        }

        if (
          value.includes(
            'high'
          ) ||
          value.includes(
            'contrast'
          )
        ) {
          return (
            'brightness(0.90) ' +
            'contrast(1.28) ' +
            'saturate(1.16)'
          );
        }

        if (
          value.includes(
            'moody'
          ) ||
          value.includes(
            'blue'
          )
        ) {
          return (
            'brightness(0.88) ' +
            'contrast(1.20) ' +
            'saturate(1.14) ' +
            'hue-rotate(-6deg)'
          );
        }

        return (
          'brightness(0.90) ' +
          'contrast(1.18) ' +
          'saturate(1.12)'
        );
      };

      /*
       * -----------------------------------------------------
       * DRAW COVER
       * -----------------------------------------------------
       */

      const drawCover = (
        element,
        options = {}
      ) => {
        const {
          scale = 1,
          offsetX = 0,
          offsetY = 0,
          opacity = 1,
          brightness = 1,
          colorGrade =
            'dark-cinematic'
        } = options;

        const sourceWidth =
          element.videoWidth ||
          element.naturalWidth ||
          canvas.width;

        const sourceHeight =
          element.videoHeight ||
          element.naturalHeight ||
          canvas.height;

        if (
          !sourceWidth ||
          !sourceHeight
        ) {
          throw new Error(
            'Source media has no usable dimensions.'
          );
        }

        const sourceRatio =
          sourceWidth /
          sourceHeight;

        const canvasRatio =
          canvas.width /
          canvas.height;

        let width;
        let height;

        if (
          sourceRatio >
          canvasRatio
        ) {
          height =
            canvas.height *
            scale;

          width =
            height *
            sourceRatio;
        } else {
          width =
            canvas.width *
            scale;

          height =
            width /
            sourceRatio;
        }

        const x =
          (
            canvas.width -
            width
          ) /
            2 +
          offsetX;

        const y =
          (
            canvas.height -
            height
          ) /
            2 +
          offsetY;

        ctx.save();

        ctx.globalAlpha =
          opacity;

        const finalBrightness =
          clamp(
            brightness,
            0.65,
            1.15
          );

        ctx.filter =
          `${getColourFilter(
            colorGrade
          )} brightness(${finalBrightness})`;

        ctx.drawImage(
          element,
          x,
          y,
          width,
          height
        );

        ctx.restore();
      };

      /*
       * -----------------------------------------------------
       * GRADE OVERLAY
       * -----------------------------------------------------
       */

      const drawGradeOverlay = (
        grade
      ) => {
        const value =
          String(
            grade || ''
          ).toLowerCase();

        if (
          value.includes(
            'moody'
          ) ||
          value.includes(
            'blue'
          ) ||
          value.includes(
            'dark'
          )
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

          ctx.fillStyle =
            gradient;

          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          ctx.restore();
        }

        const vignette =
          ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            canvas.height *
              0.18,
            canvas.width / 2,
            canvas.height / 2,
            canvas.height *
              0.82
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

        ctx.fillStyle =
          vignette;

        ctx.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.restore();
      };

      /*
       * -----------------------------------------------------
       * TEXT
       * -----------------------------------------------------
       */

      const drawTextOverlay = (
        text,
        progress,
        textIn,
        textOut,
        style
      ) => {
        const value =
          String(
            text || ''
          ).trim();

        if (!value) {
          return;
        }

        const inPoint =
          clamp(
            Number(
              textIn
            ) || 0.12,
            0,
            0.8
          );

        const outPoint =
          clamp(
            Number(
              textOut
            ) || 0.88,
            inPoint +
              0.05,
            1
          );

        let alpha = 1;

        if (
          progress <
          inPoint
        ) {
          alpha =
            progress /
            Math.max(
              0.01,
              inPoint
            );
        } else if (
          progress >
          outPoint
        ) {
          alpha =
            1 -
            (
              progress -
              outPoint
            ) /
              Math.max(
                0.05,
                1 - outPoint
              );
        }

        alpha =
          clamp(
            alpha,
            0,
            1
          );

        const rise =
          (
            1 -
            easeOut(alpha)
          ) *
          24;

        const textStyle =
          String(
            style ||
              'cinematic'
          ).toLowerCase();

        ctx.save();

        ctx.globalAlpha =
          alpha;

        ctx.textAlign =
          'center';

        ctx.textBaseline =
          'middle';

        ctx.font =
          textStyle.includes(
            'small'
          )
            ? '600 38px Arial, sans-serif'
            : '700 54px Arial, sans-serif';

        ctx.shadowColor =
          'rgba(0,0,0,0.92)';

        ctx.shadowBlur =
          18;

        ctx.shadowOffsetY =
          4;

        ctx.fillStyle =
          '#fff';

        ctx.fillText(
          value.toUpperCase(),
          canvas.width / 2,
          canvas.height -
            210 +
            rise
        );

        ctx.restore();
      };

      /*
       * -----------------------------------------------------
       * TRANSITION
       * -----------------------------------------------------
       */

      let previousFrame =
        null;

      const drawTransition = (
        type,
        progress,
        isFirstCut
      ) => {
        const transition =
          String(
            type ||
              'hard-cut'
          ).toLowerCase();

        const p =
          clamp(
            progress,
            0,
            1
          );

        if (
          transition ===
            'crossfade' &&
          previousFrame
        ) {
          ctx.save();

          ctx.globalAlpha =
            1 - p;

          ctx.drawImage(
            previousFrame,
            0,
            0
          );

          ctx.restore();

          return;
        }

        if (
          transition ===
            'fade-in' ||
          transition ===
            'fade' ||
          (
            isFirstCut &&
            transition ===
              'cinematic'
          )
        ) {
          ctx.save();

          ctx.fillStyle =
            '#000';

          ctx.globalAlpha =
            1 - p;

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
          transition ===
          'fade-out'
        ) {
          ctx.save();

          ctx.fillStyle =
            '#000';

          ctx.globalAlpha =
            p;

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
          transition ===
          'flash-cut'
        ) {
          const flash =
            Math.max(
              0,
              1 -
                Math.abs(
                  p - 0.5
                ) *
                  8
            );

          ctx.save();

          ctx.fillStyle =
            '#fff';

          ctx.globalAlpha =
            flash *
            0.82;

          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          ctx.restore();
        }
      };

      /*
       * -----------------------------------------------------
       * VIDEO LOADER
       *
       * This is the major fix.
       *
       * We no longer treat onerror as successful loading.
       * We wait for real video data.
       * -----------------------------------------------------
       */

      const loadVideo = (
        src
      ) =>
        new Promise(
          (
            resolveLoad,
            rejectLoad
          ) => {
            const video =
              document.createElement(
                'video'
              );

            video.muted =
              true;

            video.defaultMuted =
              true;

            video.playsInline =
              true;

            video.setAttribute(
              'playsinline',
              ''
            );

            video.setAttribute(
              'webkit-playsinline',
              ''
            );

            video.preload =
              'auto';

            /*
             * CORS is required when a public remote Blob URL
             * is used as the source for canvas rendering.
             */
            video.crossOrigin =
              'anonymous';

            let settled =
              false;

            const timeout =
              setTimeout(
                () => {
                  finishError(
                    new Error(
                      'Video loading timed out after 15 seconds.'
                    )
                  );
                },
                15000
              );

            const cleanup =
              () => {
                clearTimeout(
                  timeout
                );

                video.removeEventListener(
                  'loadedmetadata',
                  onMetadata
                );

                video.removeEventListener(
                  'loadeddata',
                  onLoadedData
                );

                video.removeEventListener(
                  'canplay',
                  onCanPlay
                );

                video.removeEventListener(
                  'error',
                  onError
                );
              };

            const finish =
              () => {
                if (
                  settled
                ) {
                  return;
                }

                settled =
                  true;

                cleanup();

                resolveLoad(
                  video
                );
              };

            const finishError =
              (error) => {
                if (
                  settled
                ) {
                  return;
                }

                settled =
                  true;

                cleanup();

                rejectLoad(
                  error
                );
              };

            const onMetadata =
              () => {
                console.log(
                  'BIKEZTAGRAM renderer: video metadata loaded',
                  {
                    width:
                      video.videoWidth,
                    height:
                      video.videoHeight,
                    duration:
                      video.duration
                  }
                );
              };

            const onLoadedData =
              () => {
                if (
                  video.readyState >=
                  2
                ) {
                  finish();
                }
              };

            const onCanPlay =
              () => {
                if (
                  video.readyState >=
                  2
                ) {
                  finish();
                }
              };

            const onError =
              () => {
                const mediaError =
                  video.error;

                finishError(
                  new Error(
                    `Video could not be loaded${
                      mediaError?.code
                        ? ` (media error ${mediaError.code})`
                        : ''
                    }.`
                  )
                );
              };

            video.addEventListener(
              'loadedmetadata',
              onMetadata
            );

            video.addEventListener(
              'loadeddata',
              onLoadedData
            );

            video.addEventListener(
              'canplay',
              onCanPlay
            );

            video.addEventListener(
              'error',
              onError
            );

            video.src =
              src;

            video.load();
          }
        );

      /*
       * -----------------------------------------------------
       * WAIT FOR A REAL VIDEO FRAME
       * -----------------------------------------------------
       */

      const waitForVideoFrame =
        async (
          video
        ) => {
          if (
            video.readyState <
            2
          ) {
            await new Promise(
              (
                resolveFrame
              ) => {
                const timeout =
                  setTimeout(
                    resolveFrame,
                    2000
                  );

                const check =
                  () => {
                    if (
                      video.readyState >=
                      2
                    ) {
                      clearTimeout(
                        timeout
                      );

                      video.removeEventListener(
                        'loadeddata',
                        check
                      );

                      video.removeEventListener(
                        'canplay',
                        check
                      );

                      resolveFrame();
                    }
                  };

                video.addEventListener(
                  'loadeddata',
                  check
                );

                video.addEventListener(
                  'canplay',
                  check
                );

                check();
              }
            );
          }

          /*
           * Give the browser a frame opportunity.
           */

          if (
            typeof video.requestVideoFrameCallback ===
            'function'
          ) {
            await new Promise(
              (
                resolveFrame
              ) => {
                video.requestVideoFrameCallback(
                  () =>
                    resolveFrame()
                );
              }
            );
          } else {
            await new Promise(
              (
                resolveFrame
              ) =>
                requestAnimationFrame(
                  () =>
                    resolveFrame()
                )
            );
          }
        };

      /*
       * -----------------------------------------------------
       * START RECORDING
       * -----------------------------------------------------
       */

      try {
        recorder.start(
          1000
        );
      } catch (error) {
        fail(
          new Error(
            `Could not start recording: ${
              error?.message ||
              String(error)
            }`
          )
        );

        return;
      }

      /*
       * -----------------------------------------------------
       * RENDER CUTS
       * -----------------------------------------------------
       */

      let currentCutIndex =
        0;

      const renderCut =
        async () => {
          if (finished) {
            return;
          }

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
            cuts[
              currentCutIndex
            ] || {};

          const media =
            findMedia(cut);

          if (!media) {
            fail(
              new Error(
                `AI edit plan references media that was not found. Cut ${currentCutIndex + 1}, mediaId: ${cut.mediaId}, mediaIndex: ${cut.mediaIndex}`
              )
            );

            return;
          }

          const source =
            getSource(media);

          if (!source) {
            fail(
              new Error(
                `Media item ${
                  currentCutIndex + 1
                } does not contain a usable file, blob, URL or source.`
              )
            );

            return;
          }

          const mediaType =
            String(
              media.type ||
                ''
            ).toLowerCase();

          const isVideo =
            mediaType.startsWith(
              'video'
            ) ||
            media.file instanceof
              Blob ||
            media.blob instanceof
              Blob;

          const duration =
            clamp(
              Number(
                cut.duration
              ) || 2,
              0.5,
              30
            );

          const speed =
            clamp(
              Number(
                cut.speed
              ) || 1,
              0.25,
              2
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

          let video =
            null;

          let image =
            null;

          let sourceUrl =
            source.src;

          try {
            /*
             * -------------------------------------------------
             * LOAD VIDEO
             * -------------------------------------------------
             */

            if (
              isVideo
            ) {
              video =
                await loadVideo(
                  sourceUrl
                );

              console.log(
                'BIKEZTAGRAM renderer: video ready',
                {
                  width:
                    video.videoWidth,
                  height:
                    video.videoHeight,
                  duration:
                    video.duration,
                  readyState:
                    video.readyState
                }
              );

              if (
                video.videoWidth <=
                  0 ||
                video.videoHeight <=
                  0
              ) {
                throw new Error(
                  'Video loaded but has invalid dimensions.'
                );
              }

              /*
               * Seek to the AI-selected start time.
               */

              const requestedStart =
                Number(
                  cut.startTime
                );

              if (
                Number.isFinite(
                  requestedStart
                ) &&
                requestedStart >=
                  0 &&
                Number.isFinite(
                  video.duration
                )
              ) {
                const safeStart =
                  Math.min(
                    requestedStart,
                    Math.max(
                      0,
                      video.duration -
                        0.05
                    )
                  );

                if (
                  Math.abs(
                    video.currentTime -
                      safeStart
                  ) >
                  0.01
                ) {
                  await new Promise(
                    (
                      resolveSeek,
                      rejectSeek
                    ) => {
                      let done =
                        false;

                      const timeout =
                        setTimeout(
                          () => {
                            if (
                              done
                            ) {
                              return;
                            }

                            done =
                              true;

                            video.removeEventListener(
                              'seeked',
                              onSeeked
                            );

                            rejectSeek(
                              new Error(
                                'Video seek timed out.'
                              )
                            );
                          },
                          5000
                        );

                      const onSeeked =
                        () => {
                          if (
                            done
                          ) {
                            return;
                          }

                          done =
                            true;

                          clearTimeout(
                            timeout
                          );

                          video.removeEventListener(
                            'seeked',
                            onSeeked
                          );

                          resolveSeek();
                        };

                      video.addEventListener(
                        'seeked',
                        onSeeked
                      );

                      video.currentTime =
                        safeStart;
                    }
                  );
                }
              }

              video.playbackRate =
                speed;

              /*
               * Start playback and actually verify that it
               * starts rather than silently ignoring an error.
               */

              try {
                await video.play();
              } catch (playError) {
                console.warn(
                  'BIKEZTAGRAM renderer: video.play() warning:',
                  playError
                );
              }

              await waitForVideoFrame(
                video
              );

              /*
               * Make sure at least one frame can be drawn.
               */

              ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
              );

              ctx.fillStyle =
                '#000';

              ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
              );

              drawCover(
                video,
                {
                  scale: 1.03,
                  colorGrade
                }
              );

              /*
               * If the canvas is still completely untouched by
               * the source this will be caught as a renderer
               * problem instead of silently creating a black
               * video.
               */
            } else {
              /*
               * ------------------------------------------------
               * IMAGE SUPPORT
               * ------------------------------------------------
               */

              image =
                new Image();

              image.src =
                sourceUrl;

              await new Promise(
                (
                  resolveImage,
                  rejectImage
                ) => {
                  const timeout =
                    setTimeout(
                      () =>
                        rejectImage(
                          new Error(
                            'Image loading timed out.'
                          )
                        ),
                      10000
                    );

                  image.onload =
                    () => {
                      clearTimeout(
                        timeout
                      );

                      resolveImage();
                    };

                  image.onerror =
                    () => {
                      clearTimeout(
                        timeout
                      );

                      rejectImage(
                        new Error(
                          'Image could not be loaded.'
                        )
                      );
                    };
                }
              );
            }

            /*
             * -------------------------------------------------
             * FRAME LOOP
             * -------------------------------------------------
             */

            const start =
              performance.now();

            const transitionLength =
              Math.min(
                0.4,
                Math.max(
                  0.12,
                  duration *
                    0.18
                )
              );

            let animationFrame =
              null;

            const drawFrame =
              () => {
                if (
                  finished
                ) {
                  return;
                }

                const elapsed =
                  performance.now() -
                  start;

                const progress =
                  clamp(
                    elapsed /
                      (
                        duration *
                        1000
                      ),
                    0,
                    1
                  );

                const eased =
                  easeInOut(
                    progress
                  );

                /*
                 * ------------------------------------------------
                 * BASE
                 * ------------------------------------------------
                 */

                ctx.clearRect(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );

                ctx.fillStyle =
                  '#000';

                ctx.fillRect(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );

                /*
                 * ------------------------------------------------
                 * MOTION
                 * ------------------------------------------------
                 */

                let scale =
                  stabilization
                    ? 1.07
                    : 1.035;

                let offsetX =
                  0;

                let offsetY =
                  0;

                const intensity =
                  clamp(
                    Number(
                      cut.motionIntensity
                    ) || 1,
                    0.35,
                    1.5
                  );

                if (
                  motion.includes(
                    'slow-push'
                  ) ||
                  motion.includes(
                    'push'
                  ) ||
                  motion ===
                    'zoom'
                ) {
                  scale +=
                    eased *
                    0.105 *
                    intensity;
                } else if (
                  motion.includes(
                    'slow-pull'
                  ) ||
                  motion.includes(
                    'pull'
                  ) ||
                  motion.includes(
                    'zoom-out'
                  )
                ) {
                  scale +=
                    (1 - eased) *
                    0.105 *
                    intensity;
                } else if (
                  motion.includes(
                    'pan-right'
                  )
                ) {
                  scale =
                    Math.max(
                      scale,
                      1.08
                    );

                  offsetX =
                    (
                      eased -
                      0.5
                    ) *
                    canvas.width *
                    0.13 *
                    intensity;
                } else if (
                  motion.includes(
                    'pan-left'
                  )
                ) {
                  scale =
                    Math.max(
                      scale,
                      1.08
                    );

                  offsetX =
                    (
                      0.5 -
                      eased
                    ) *
                    canvas.width *
                    0.13 *
                    intensity;
                } else if (
                  motion.includes(
                    'tilt-up'
                  )
                ) {
                  scale =
                    Math.max(
                      scale,
                      1.08
                    );

                  offsetY =
                    (
                      0.5 -
                      eased
                    ) *
                    canvas.height *
                    0.08 *
                    intensity;
                } else if (
                  motion.includes(
                    'tilt-down'
                  )
                ) {
                  scale =
                    Math.max(
                      scale,
                      1.08
                    );

                  offsetY =
                    (
                      eased -
                      0.5
                    ) *
                    canvas.height *
                    0.08 *
                    intensity;
                } else if (
                  motion.includes(
                    'pan'
                  )
                ) {
                  scale =
                    Math.max(
                      scale,
                      1.06
                    );

                  offsetX =
                    Math.sin(
                      eased *
                        Math.PI
                    ) *
                    canvas.width *
                    0.035;
                } else if (
                  motion.includes(
                    'cinematic'
                  )
                ) {
                  scale +=
                    eased *
                    0.055 *
                    intensity;
                }

                scale =
                  clamp(
                    scale,
                    1.01,
                    1.22
                  );

                /*
                 * ------------------------------------------------
                 * SOURCE FRAME
                 * ------------------------------------------------
                 */

                if (
                  video
                ) {
                  if (
                    video.readyState >=
                    2
                  ) {
                    drawCover(
                      video,
                      {
                        scale,
                        offsetX,
                        offsetY,
                        opacity:
                          1,
                        brightness:
                          1,
                        colorGrade
                      }
                    );
                  }
                } else if (
                  image &&
                  image.complete
                ) {
                  drawCover(
                    image,
                    {
                      scale,
                      offsetX,
                      offsetY,
                      opacity:
                        1,
                      brightness:
                        1,
                      colorGrade
                    }
                  );
                }

                /*
                 * ------------------------------------------------
                 * CINEMATIC GRADE
                 * ------------------------------------------------
                 */

                drawGradeOverlay(
                  colorGrade
                );

                /*
                 * ------------------------------------------------
                 * TRANSITION
                 * ------------------------------------------------
                 */

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
                      (
                        transitionLength /
                        duration
                      ),
                    currentCutIndex ===
                      0
                  );
                }

                /*
                 * ------------------------------------------------
                 * TEXT
                 * ------------------------------------------------
                 */

                drawTextOverlay(
                  cut.text ||
                    '',
                  progress,
                  cut.textIn,
                  cut.textOut,
                  cut.textStyle
                );

                /*
                 * ------------------------------------------------
                 * PROGRESS
                 * ------------------------------------------------
                 */

                if (
                  onProgress
                ) {
                  onProgress(
                    Math.round(
                      (
                        (
                          currentCutIndex +
                          progress
                        ) /
                        cuts.length
                      ) *
                        100
                    )
                  );
                }

                /*
                 * ------------------------------------------------
                 * NEXT FRAME / NEXT CUT
                 * ------------------------------------------------
                 */

                if (
                  progress >=
                  1
                ) {
                  if (
                    animationFrame
                  ) {
                    cancelAnimationFrame(
                      animationFrame
                    );
                  }

                  if (
                    video
                  ) {
                    try {
                      video.pause();
                    } catch {}
                  }

                  /*
                   * Store final rendered frame.
                   */

                  try {
                    previousFrame =
                      document.createElement(
                        'canvas'
                      );

                    previousFrame.width =
                      canvas.width;

                    previousFrame.height =
                      canvas.height;

                    const previousCtx =
                      previousFrame.getContext(
                        '2d'
                      );

                    previousCtx.drawImage(
                      canvas,
                      0,
                      0
                    );
                  } catch {
                    previousFrame =
                      null;
                  }

                  /*
                   * Clean up object URLs.
                   */

                  if (
                    source.revoke
                  ) {
                    try {
                      URL.revokeObjectURL(
                        sourceUrl
                      );
                    } catch {}
                  }

                  currentCutIndex++;

                  renderCut();

                  return;
                }

                animationFrame =
                  requestAnimationFrame(
                    drawFrame
                  );
              };

            animationFrame =
              requestAnimationFrame(
                drawFrame
              );
          } catch (error) {
            console.error(
              'BIKEZTAGRAM renderer cut failed:',
              error
            );

            if (
              source.revoke
            ) {
              try {
                URL.revokeObjectURL(
                  sourceUrl
                );
              } catch {}
            }

            fail(
              new Error(
                `Render failed on cut ${
                  currentCutIndex + 1
                }: ${
                  error?.message ||
                  String(error)
                }`
              )
            );
          }
        };

      renderCut();
    } catch (error) {
      fail(error);
    }
  });
              }
