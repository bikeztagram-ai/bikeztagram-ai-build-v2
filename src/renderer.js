export async function renderProject(
  mediaItems,
  plan,
  onProgress
) {
  return new Promise((resolve, reject) => {
    try {
      const canvas =
        document.createElement('canvas');

      canvas.width = 1080;
      canvas.height = 1920;

      const ctx =
        canvas.getContext('2d');

      if (!ctx) {
        reject(
          new Error(
            'Could not create canvas context.'
          )
        );
        return;
      }

      const stream =
        canvas.captureStream(30);

      const mimeTypes = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp8',
        'video/webm'
      ];

      const selectedType =
        mimeTypes.find((type) =>
          MediaRecorder.isTypeSupported(
            type
          )
        ) || '';

      const recorder =
        selectedType
          ? new MediaRecorder(stream, {
              mimeType: selectedType
            })
          : new MediaRecorder(stream);

      const chunks = [];

      recorder.ondataavailable =
        (event) => {
          if (
            event.data &&
            event.data.size > 0
          ) {
            chunks.push(event.data);
          }
        };

      recorder.onerror = (event) => {
        reject(
          event.error ||
            new Error(
              'Video recording failed.'
            )
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

      const cuts =
        Array.isArray(plan?.cuts)
          ? plan.cuts
          : [];

      if (cuts.length === 0) {
        recorder.stop();
        return;
      }

      let currentCutIndex = 0;

      const findMediaForCut =
        (cut) => {
          if (!cut) return null;

          if (
            cut.mediaId !==
              undefined &&
            cut.mediaId !== null
          ) {
            const byId =
              mediaItems.find(
                (item) =>
                  String(item.id) ===
                  String(cut.mediaId)
              );

            if (byId) return byId;
          }

          if (
            cut.mediaIndex !==
              undefined &&
            cut.mediaIndex !== null &&
            Number.isFinite(
              Number(cut.mediaIndex)
            )
          ) {
            const index =
              Number(cut.mediaIndex);

            if (mediaItems[index]) {
              return mediaItems[index];
            }

            if (
              mediaItems[index - 1]
            ) {
              return mediaItems[
                index - 1
              ];
            }
          }

          if (
            cut.clipIndex !==
              undefined &&
            cut.clipIndex !== null &&
            Number.isFinite(
              Number(cut.clipIndex)
            )
          ) {
            const index =
              Number(cut.clipIndex);

            if (mediaItems[index]) {
              return mediaItems[index];
            }

            if (
              mediaItems[index - 1]
            ) {
              return mediaItems[
                index - 1
              ];
            }
          }

          return null;
        };

      const processNextCut =
        async () => {
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
            findMediaForCut(cut);

          const durationSeconds =
            Number(cut?.duration) ||
            3;

          const durationMs =
            Math.max(
              500,
              durationSeconds * 1000
            );

          if (
            !media ||
            !media.file
          ) {
            console.warn(
              'Could not find media for AI cut:',
              cut
            );

            currentCutIndex++;

            processNextCut();

            return;
          }

          const isVideo =
            typeof media.type ===
              'string' &&
            media.type.startsWith(
              'video'
            );

          const fileUrl =
            URL.createObjectURL(
              media.file
            );

          const element = isVideo
            ? document.createElement(
                'video'
              )
            : new Image();

          try {
            if (isVideo) {
              element.muted = true;
              element.playsInline = true;
              element.autoplay = false;
              element.preload = 'auto';
              element.src = fileUrl;

              await new Promise(
                (resolveLoad) => {
                  let finished = false;

                  const finish =
                    () => {
                      if (finished)
                        return;

                      finished = true;

                      resolveLoad();
                    };

                  const timeout =
                    setTimeout(
                      finish,
                      5000
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

              await element
                .play()
                .catch(() => {});
            } else {
              element.src = fileUrl;

              await new Promise(
                (resolveLoad) => {
                  let finished = false;

                  const finish =
                    () => {
                      if (finished)
                        return;

                      finished = true;

                      resolveLoad();
                    };

                  const timeout =
                    setTimeout(
                      finish,
                      5000
                    );

                  element.onload =
                    () => {
                      clearTimeout(
                        timeout
                      );

                      finish();
                    };

                 
