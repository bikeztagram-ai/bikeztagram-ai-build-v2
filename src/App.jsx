import React, { useMemo, useState } from 'react';
import { renderProject } from './renderer';
import './styles.css';

const FRAME_COUNT = 6;

function waitForVideoMetadata(video) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 1 && video.duration) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Could not read video information.'));
    }, 10000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      resolve();
    };

    video.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Could not load video.'));
    };

    video.load();
  });
}

function seekVideo(video, time) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Video seek timed out.'));
    }, 5000);

    const done = () => {
      clearTimeout(timeout);
      video.removeEventListener('seeked', done);
      resolve();
    };

    video.addEventListener('seeked', done);

    try {
      video.currentTime = time;
    } catch (error) {
      clearTimeout(timeout);
      video.removeEventListener('seeked', done);
      reject(error);
    }
  });
}

function canvasToBase64(canvas) {
  const dataUrl = canvas.toDataURL(
    'image/jpeg',
    0.72
  );

  return dataUrl.split(',')[1];
}

async function extractVideoFrames(file, mediaIndex) {
  const video = document.createElement('video');

  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';

  const objectUrl =
    URL.createObjectURL(file);

  video.src = objectUrl;

  try {
    await waitForVideoMetadata(video);

    const duration =
      Number(video.duration) || 0;

    if (!duration) {
      return [];
    }

    const canvas =
      document.createElement('canvas');

    /*
     * Keep the frames reasonably small.
     * Gemini does not need full 1080p frames
     * to understand what is happening.
     */
    const maxWidth = 640;

    const sourceWidth =
      video.videoWidth || 1280;

    const sourceHeight =
      video.videoHeight || 720;

    const scale =
      Math.min(
        1,
        maxWidth / sourceWidth
      );

    canvas.width =
      Math.round(sourceWidth * scale);

    canvas.height =
      Math.round(sourceHeight * scale);

    const ctx =
      canvas.getContext('2d');

    if (!ctx) {
      return [];
    }

    const frames = [];

    const count =
      Math.min(
        FRAME_COUNT,
        Math.max(
          1,
          Math.ceil(duration / 2)
        )
      );

    for (let i = 0; i < count; i++) {
      /*
       * Avoid sampling exactly at the first
       * and last frame because those can sometimes
       * be black or incomplete.
       */
      let time;

      if (count === 1) {
        time = duration / 2;
      } else {
        const ratio =
          i / (count - 1);

        time =
          Math.max(
            0.05,
            Math.min(
              duration - 0.05,
              duration * ratio
            )
          );
      }

      try {
        await seekVideo(
          video,
          time
        );

        ctx.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );

        frames.push({
          time,
          mimeType: 'image/jpeg',
          data:
            canvasToBase64(canvas)
        });
      } catch (error) {
        console.warn(
          'Could not extract frame:',
          error
        );
      }
    }

    return frames;
  } finally {
    URL.revokeObjectURL(objectUrl);

    video.removeAttribute('src');
    video.load();
  }
}

async function extractVisuals(mediaItems, onProgress) {
  const visuals = [];

  const total =
    mediaItems.length;

  for (
    let index = 0;
    index < total;
    index++
  ) {
    const media =
      mediaItems[index];

    try {
      if (
        media.type &&
        media.type.startsWith('video/')
      ) {
        const frames =
          await extractVideoFrames(
            media.file,
            index
          );

        visuals.push({
          mediaIndex: index,
          name: media.name,
          frames
        });
      } else if (
        media.type &&
        media.type.startsWith('image/')
      ) {
        /*
         * Send uploaded photos directly to Gemini
         * as JPEG data.
         */
        const imageData =
          await new Promise(
            (resolve, reject) => {
              const reader =
                new FileReader();

              reader.onload = () => {
                const result =
                  String(
                    reader.result || ''
                  );

                resolve(
                  result.split(',')[1]
                );
              };

              reader.onerror =
                () =>
                  reject(
                    new Error(
                      'Could not read image.'
                    )
                  );

              reader.readAsDataURL(
                media.file
              );
            }
          );

        visuals.push({
          mediaIndex: index,
          name: media.name,
          frames: [
            {
              time: 0,
              mimeType:
                media.type ||
                'image/jpeg',
              data: imageData
            }
          ]
        });
      }
    } catch (error) {
      console.warn(
        `Could not analyse media ${index}:`,
        error
      );

      visuals.push({
        mediaIndex: index,
        name: media.name,
        frames: []
      });
    }

    if (onProgress) {
      onProgress(
        Math.round(
          ((index + 1) /
            total) *
            100
        )
      );
    }
  }

  return visuals;
}

export default function App() {
  const [files, setFiles] =
    useState([]);

  const [prompt, setPrompt] =
    useState('');

  const [status, setStatus] =
    useState('');

  const [progress, setProgress] =
    useState(0);

  const [videoUrl, setVideoUrl] =
    useState(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const mediaItems =
    useMemo(() => {
      return files.map(
        (file, index) => ({
          id: index,
          file,
          type: file.type,
          name: file.name,
          size: file.size
        })
      );
    }, [files]);

  const handleFileChange =
    (event) => {
      const selectedFiles =
        Array.from(
          event.target.files || []
        );

      setFiles(selectedFiles);
      setVideoUrl(null);
      setProgress(0);

      if (selectedFiles.length) {
        setStatus(
          `${selectedFiles.length} media item${
            selectedFiles.length === 1
              ? ''
              : 's'
          } loaded.`
        );
      } else {
        setStatus('');
      }
    };

  const createAIEditPlan =
    async (visuals) => {
      const media =
        mediaItems.map(
          (item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            size: item.size
          })
        );

      const response =
        await fetch(
          '/api/render',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify({
              prompt:
                prompt ||
                'Create an epic cinematic motorcycle trailer.',
              media,
              visuals
            })
          }
        );

      const text =
        await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned invalid JSON: ${text.slice(
            0,
            200
          )}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Server error ${response.status}`
        );
      }

      if (!data?.plan) {
        throw new Error(
          'AI did not return an edit plan.'
        );
      }

      return data.plan;
    };

  const handleGenerate =
    async () => {
      if (!files.length) {
        setStatus(
          'Please upload at least one image or video clip.'
        );
        return;
      }

      setIsProcessing(true);
      setProgress(0);
      setVideoUrl(null);

      try {
        setStatus(
          'AI Director is looking at your footage...'
        );

        /*
         * STEP 1:
         * Extract representative frames.
         */
        const visuals =
          await extractVisuals(
            mediaItems,
            (percentage) => {
              setProgress(
                Math.round(
                  percentage * 0.35
                )
              );
            }
          );

        setStatus(
          'AI Director is analysing the footage...'
        );

        /*
         * STEP 2:
         * Send the actual visual frames
         * to Gemini.
         */
        const editPlan =
          await createAIEditPlan(
            visuals
          );

        if (
          !Array.isArray(
            editPlan.cuts
          ) ||
          !editPlan.cuts.length
        ) {
          throw new Error(
            'AI returned an empty edit plan.'
          );
        }

        setStatus(
          `AI selected ${editPlan.cuts.length} shots. Rendering...`
        );

        /*
         * STEP 3:
         * Render the AI's edit plan.
         */
        const videoBlob =
          await renderProject(
            mediaItems,
            editPlan,
            (percentage) => {
              setProgress(
                Math.round(
                  35 +
                    percentage *
                      0.65
                )
              );
            }
          );

        if (
          !videoBlob ||
          videoBlob.size === 0
        ) {
          throw new Error(
            'Renderer produced an empty video.'
          );
        }

        const url =
          URL.createObjectURL(
            videoBlob
          );

        setVideoUrl(url);
        setProgress(100);
        setStatus(
          'Your AI-directed cinematic reel is ready! 🔥'
        );
      } catch (error) {
        console.error(
          'Generation error:',
          error
        );

        setStatus(
          `Something went wrong: ${
            error?.message ||
            'Unknown error'
          }`
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const clearProject =
    () => {
      if (videoUrl) {
        URL.revokeObjectURL(
          videoUrl
        );
      }

      setFiles([]);
      setPrompt('');
      setStatus('');
      setProgress(0);
      setVideoUrl(null);
    };

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>
            BIKEZTAGRAM AI
          </h1>

          <p>
            AI-powered motorcycle
            video editor
          </p>
        </div>
      </header>

      <main>
        <section className="form-group">
          <label htmlFor="media-upload">
            Your clips & photos
          </label>

          <input
            id="media-upload"
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={
              handleFileChange
            }
            disabled={
              isProcessing
            }
          />

          {files.length > 0 && (
            <p className="status-text">
              {files.length} media item
              {files.length === 1
                ? ''
                : 's'} loaded
            </p>
          )}
        </section>

        <section className="form-group">
          <label htmlFor="edit-prompt">
            Tell the AI what you want
          </label>

          <textarea
            id="edit-prompt"
            rows={6}
            value={prompt}
            onChange={(event) =>
              setPrompt(
                event.target.value
              )
            }
            disabled={
              isProcessing
            }
            placeholder="Create an epic cinema-grade Kawasaki Ninja 1000SX trailer. Start mysterious, build tension, reveal the bike, then hit hard with aggressive riding footage. Use dramatic pacing, motivated cuts and premium cinematic transitions."
          />
        </section>

        <div className="button-row">
          <button
            onClick={
              handleGenerate
            }
            disabled={
              isProcessing ||
              files.length === 0
            }
            className="generate-btn"
          >
            {isProcessing
              ? `Creating Reel ${progress}%`
              : '✨ Create AI Reel'}
          </button>

          {(files.length > 0 ||
            videoUrl) &&
            !isProcessing && (
              <button
                onClick={
                  clearProject
                }
                className="clear-btn"
              >
                Clear
              </button>
            )}
        </div>

        {status && (
          <div className="status-panel">
            <p className="status-text">
              {status}
            </p>

            {isProcessing && (
              <div className="progress-track">
                <div
                  className="progress-bar"
                  style={{
                    width: `${
