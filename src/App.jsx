import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';
import './styles.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleFile(event) {
    const selected =
      event.target.files?.[0] || null;

    setFile(selected);
    setAnalysis(null);
    setProgress(0);

    if (selected) {
      const mb =
        selected.size /
        1024 /
        1024;

      setStatus(
        `Loaded: ${selected.name} (${mb.toFixed(1)} MB)`
      );
    } else {
      setStatus('');
    }
  }

  async function analyseVideo() {
    if (!file) {
      setStatus(
        'Please select a video first.'
      );
      return;
    }

    if (!file.type.startsWith('video/')) {
      setStatus(
        'Please select a video file.'
      );
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setProgress(0);

    try {
      /*
       * STEP 1
       * Upload directly from the browser to the
       * private Vercel Blob store using Vercel's
       * official client-upload system.
       */
      setStatus(
        'Preparing secure video upload...'
      );

      const useMultipart =
        file.size >
        100 * 1024 * 1024;

      const blob =
        await upload(
          `videos/${Date.now()}-${file.name}`,
          file,
          {
            access: 'private',

            handleUploadUrl:
              '/api/upload',

            contentType:
              file.type ||
              'video/mp4',

            multipart:
              useMultipart,

            onUploadProgress:
              (event) => {
                const percentage =
                  Number(
                    event?.percentage
                  ) || 0;

                setProgress(
                  Math.round(
                    percentage
                  )
                );

                setStatus(
                  `Uploading video directly to secure Blob storage... ${Math.round(
                    percentage
                  )}%`
                );
              }
          }
        );

      console.log(
        '[APP] Blob upload complete:',
        blob
      );

      setProgress(100);

      setStatus(
        '✅ Video uploaded securely. Preparing Gemini analysis...'
      );

      /*
       * STEP 2
       *
       * Send the Blob pathname to our server.
       *
       * The server can then authenticate to the private
       * Blob store using OIDC and obtain the actual video
       * for Gemini without exposing Blob credentials.
       */
      const response =
        await fetch(
          '/api/analyse',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              videoUrl:
                blob.url,

              pathname:
                blob.pathname,

              filename:
                file.name,

              mimeType:
                file.type ||
                'video/mp4',

              prompt:
                prompt ||
                'Analyse this motorcycle footage for the best cinematic moments, camera movement, action, composition, strongest shots, useful timestamps and editing opportunities for an exciting social-media motorcycle video.'
            })
          }
        );

      const text =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(text);
      } catch {
        throw new Error(
          `Analysis server returned an invalid response: ${text.slice(
            0,
            500
          )}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Analysis server returned ${response.status}`
        );
      }

      if (!data?.analysis) {
        throw new Error(
          'Gemini returned no analysis.'
        );
      }

      setAnalysis(
        data.analysis
      );

      setStatus(
        '✅ Gemini has analysed the actual motorcycle video.'
      );

    } catch (error) {
      console.error(
        '[APP] Video processing failed:',
        error
      );

      setStatus(
        `Something went wrong: ${
          error?.message ||
          'Unknown error'
        }`
      );

    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setFile(null);
    setPrompt('');
    setStatus('');
    setProgress(0);
    setAnalysis(null);
  }

  return (
    <div className="app-container">

      <header className="app-header">
        <div>
          <h1>
            BIKEZTAGRAM AI
          </h1>

          <p>
            AI-powered motorcycle video editor
          </p>
        </div>
      </header>

      <main>

        <section className="form-group">

          <label htmlFor="video">
            Test motorcycle footage
          </label>

          <input
            id="video"
            type="file"
            accept="video/*"
            onChange={handleFile}
            disabled={loading}
          />

          {file && (
            <p className="status-text">
              {file.name}
            </p>
          )}

        </section>

        <section className="form-group">

          <label htmlFor="prompt">
            Tell Gemini what to look for
          </label>

          <textarea
            id="prompt"
            rows="5"
            value={prompt}
            onChange={(event) =>
              setPrompt(
                event.target.value
              )
            }
            disabled={loading}
            placeholder="Analyse this motorcycle footage for the strongest cinematic moments, camera movement, action, composition and best timestamps for an exciting social-media motorcycle trailer."
          />

        </section>

        <div className="button-row">

          <button
            className="generate-btn"
            onClick={analyseVideo}
            disabled={
              loading ||
              !file
            }
          >
            {loading
              ? '🎬 Processing Video...'
              : '👁️ Analyse Actual Video'}
          </button>

          {file &&
            !loading && (
              <button
                className="clear-btn"
                onClick={clearAll}
              >
                Clear
              </button>
            )}

        </div>

        {loading &&
          progress > 0 && (
            <div
              className="status-panel"
              style={{
                marginTop: '15px'
              }}
            >

              <div>
                Upload progress:
                {' '}
                {progress}%
              </div>

              <div
                style={{
                  width: '100%',
                  height: '10px',
                  background:
                    '#333',
                  borderRadius:
                    '5px',
                  marginTop:
                    '8px',
                  overflow:
                    'hidden'
                }}
              >

                <div
                  style={{
                    width:
                      `${progress}%`,
                    height:
                      '100%',
                    background:
                      '#4fd1c5',
                    transition:
                      'width 0.2s ease'
                  }}
                />

              </div>

            </div>
          )}

        {status && (
          <div
            className="status-panel"
            style={{
              marginTop: '15px'
            }}
          >

            <p className="status-text">
              {status}
            </p>

          </div>
        )}

        {analysis && (
          <section
            className="result-container"
          >

            <h2>
              Gemini Video Analysis
            </h2>

            <div
              className="status-panel"
            >

              <pre
                style={{
                  whiteSpace:
                    'pre-wrap',
                  margin: 0,
                  textAlign:
                    'left',
                  wordBreak:
                    'break-word'
                }}
              >
                {typeof analysis ===
                'string'
                  ? analysis
                  : JSON.stringify(
                      analysis,
                      null,
                      2
                    )}
              </pre>

            </div>

          </section>
        )}

      </main>

    </div>
  );
              }
