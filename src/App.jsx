import React, { useState } from 'react';
import './styles.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState(
    'Analyse this motorcycle footage for the strongest cinematic moments, camera movement, action, composition and best timestamps for an exciting social-media motorcycle video.'
  );

  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(event) {
    const selectedFile =
      event.target.files?.[0] || null;

    setFile(selectedFile);
    setAnalysis(null);
    setProgress(0);

    if (selectedFile) {
      const sizeMB =
        selectedFile.size / 1024 / 1024;

      setStatus(
        `Selected: ${selectedFile.name} (${sizeMB.toFixed(1)} MB)`
      );
    } else {
      setStatus('');
    }
  }

  function uploadFileWithProgress(
    uploadUrl,
    selectedFile,
    contentType
  ) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('PUT', uploadUrl, true);

      xhr.setRequestHeader(
        'Content-Type',
        contentType
      );

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const percentage = Math.round(
          (event.loaded / event.total) * 100
        );

        setProgress(percentage);

        setStatus(
          `Uploading video directly to secure Blob storage... ${percentage}%`
        );
      };

      xhr.onload = () => {
        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {
          let responseData = null;

          try {
            responseData =
              xhr.responseText
                ? JSON.parse(
                    xhr.responseText
                  )
                : null;
          } catch {
            responseData = null;
          }

          resolve(responseData);
          return;
        }

        reject(
          new Error(
            `Blob upload failed. HTTP ${xhr.status}${
              xhr.responseText
                ? `: ${xhr.responseText.slice(
                    0,
                    300
                  )}`
                : ''
            }`
          )
        );
      };

      xhr.onerror = () => {
        reject(
          new Error(
            'The browser could not connect to the Blob upload server.'
          )
        );
      };

      xhr.onabort = () => {
        reject(
          new Error(
            'The video upload was cancelled.'
          )
        );
      };

      xhr.send(selectedFile);
    });
  }

  async function analyseActualVideo() {
    if (!file) {
      setStatus(
        'Please choose a motorcycle video first.'
      );
      return;
    }

    if (
      !file.type ||
      !file.type.startsWith('video/')
    ) {
      setStatus(
        'Please select a valid video file.'
      );
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setProgress(0);

    try {
      /*
       * --------------------------------------------------
       * STEP 1
       * Ask our Vercel Function for a short-lived,
       * private Blob PUT URL.
       * --------------------------------------------------
       */

      setStatus(
        'Preparing secure video upload...'
      );

      const pathname =
        `videos/${Date.now()}-${crypto.randomUUID()}-${file.name}`;

      const uploadRequest =
        await fetch('/api/upload', {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            pathname,
            contentType:
              file.type || 'video/mp4',
            size: file.size
          })
        });

      const uploadText =
        await uploadRequest.text();

      let uploadData;

      try {
        uploadData =
          JSON.parse(uploadText);
      } catch {
        throw new Error(
          `Upload server returned an invalid response: ${uploadText.slice(
            0,
            500
          )}`
        );
      }

      if (!uploadRequest.ok) {
        throw new Error(
          uploadData?.error ||
            `Upload server returned HTTP ${uploadRequest.status}`
        );
      }

      if (!uploadData?.uploadUrl) {
        throw new Error(
          'The server did not return a Blob upload URL.'
        );
      }

      console.log(
        '[APP] Signed Blob upload URL received.'
      );

      console.log(
        '[APP] Blob pathname:',
        uploadData.pathname
      );

      /*
       * --------------------------------------------------
       * STEP 2
       * Upload the actual video DIRECTLY from the phone
       * to Vercel Blob.
       *
       * The video does NOT pass through /api/upload.
       * --------------------------------------------------
       */

      setStatus(
        'Uploading video directly to secure Blob storage...'
      );

      await uploadFileWithProgress(
        uploadData.uploadUrl,
        file,
        file.type || 'video/mp4'
      );

      setProgress(100);

      console.log(
        '[APP] Direct Blob upload completed successfully.'
      );

      setStatus(
        '✅ Video safely stored. Preparing Gemini analysis...'
      );

      /*
       * --------------------------------------------------
       * STEP 3
       * Tell our analysis Function which private Blob
       * object to retrieve.
       * --------------------------------------------------
       */

      const analysisRequest =
        await fetch('/api/analyse', {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            pathname:
              uploadData.pathname,

            filename:
              file.name,

            mimeType:
              file.type || 'video/mp4',

            prompt
          })
        });

      const analysisText =
        await analysisRequest.text();

      let analysisData;

      try {
        analysisData =
          JSON.parse(analysisText);
      } catch {
        throw new Error(
          `Analysis server returned an invalid response: ${analysisText.slice(
            0,
            500
          )}`
        );
      }

      if (!analysisRequest.ok) {
        throw new Error(
          analysisData?.error ||
            `Analysis server returned HTTP ${analysisRequest.status}`
        );
      }

      if (!analysisData?.analysis) {
        throw new Error(
          'Gemini returned no analysis.'
        );
      }

      setAnalysis(
        analysisData.analysis
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

  function clearVideo() {
    setFile(null);
    setAnalysis(null);
    setStatus('');
    setProgress(0);
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

          <label htmlFor="video-file">
            Test motorcycle footage
          </label>

          <input
            id="video-file"
            type="file"
            accept="video/*"
            onChange={
              handleFileChange
            }
            disabled={loading}
          />

          {file && (
            <p className="status-text">
              {file.name}
            </p>
          )}

        </section>

        <section className="form-group">

          <label htmlFor="analysis-prompt">
            Tell Gemini what to look for
          </label>

          <textarea
            id="analysis-prompt"
            rows="6"
            value={prompt}
            onChange={(event) =>
              setPrompt(
                event.target.value
              )
            }
            disabled={loading}
          />

        </section>

        <div className="button-row">

          <button
            className="generate-btn"
            onClick={
              analyseActualVideo
            }
            disabled={
              loading ||
              !file
            }
          >
            {loading
              ? '🎬 Processing Video...'
              : '👁️ Analyse Actual Video'}
          </button>

          {!loading && file && (
            <button
              className="clear-btn"
              onClick={clearVideo}
            >
              Clear
            </button>
          )}

        </div>

        {loading && (
          <section
            className="status-panel"
            style={{
              marginTop: '15px'
            }}
          >

            <p className="status-text">
              {status}
            </p>

            {progress > 0 && (
              <>
                <div
                  style={{
                    width: '100%',
                    height: '10px',
                    background:
                      '#333',
                    borderRadius:
                      '5px',
                    overflow:
                      'hidden',
                    marginTop:
                      '10px'
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

                <div
                  style={{
                    marginTop:
                      '6px'
                  }}
                >
                  {progress}%
                </div>
              </>
            )}

          </section>
        )}

        {!loading && status && (
          <section
            className="status-panel"
            style={{
              marginTop: '15px'
            }}
          >
            <p className="status-text">
              {status}
            </p>
          </section>
        )}

        {analysis && (
          <section
            className="result-container"
            style={{
              marginTop: '20px'
            }}
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
                  wordBreak:
                    'break-word',
                  textAlign:
                    'left',
                  margin: 0
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
