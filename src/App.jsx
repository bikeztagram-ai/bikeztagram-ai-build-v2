import React, { useState } from 'react';
import './styles.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleFile(event) {
    const selected = event.target.files?.[0] || null;

    setFile(selected);
    setAnalysis(null);

    if (selected) {
      const mb = selected.size / 1024 / 1024;

      setStatus(
        `Loaded: ${selected.name} (${mb.toFixed(1)} MB)`
      );
    } else {
      setStatus('');
    }
  }

  async function analyseVideo() {
    if (!file) {
      setStatus('Please select a video first.');
      return;
    }

    if (!file.type.startsWith('video/')) {
      setStatus('Please upload a video file.');
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      /*
       * STEP 1
       * Ask our Vercel Function for a short-lived
       * signed PUT URL for this specific video.
       */
      setStatus(
        'Preparing secure video upload...'
      );

      const uploadResponse = await fetch(
        '/api/upload',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'video/mp4',
            size: file.size
          })
        }
      );

      const uploadText = await uploadResponse.text();

      let uploadData;

      try {
        uploadData = JSON.parse(uploadText);
      } catch {
        throw new Error(
          `Upload server returned an invalid response: ${uploadText.slice(
            0,
            300
          )}`
        );
      }

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData?.error ||
            `Upload server error ${uploadResponse.status}`
        );
      }

      if (
        !uploadData?.uploadUrl ||
        !uploadData?.videoUrl
      ) {
        throw new Error(
          'Upload server did not return secure Blob URLs.'
        );
      }

      /*
       * STEP 2
       * Upload the actual video DIRECTLY to Vercel Blob.
       *
       * IMPORTANT:
       * Do not add a Content-Type header here.
       * The signed URL is deliberately used as a simple
       * browser PUT request.
       */
      setStatus(
        'Uploading video directly to Blob storage...'
      );

      const blobResponse = await fetch(
        uploadData.uploadUrl,
        {
          method: 'PUT',
          body: file
        }
      );

      if (!blobResponse.ok) {
        const blobError = await blobResponse.text();

        throw new Error(
          `Blob upload failed (${blobResponse.status}): ${blobError.slice(
            0,
            500
          )}`
        );
      }

      /*
       * STEP 3
       * The video is now stored.
       * Give Gemini the temporary signed GET URL.
       */
      setStatus(
        '✅ Video uploaded securely. Sending it to Gemini...'
      );

      const response = await fetch(
        '/api/analyse',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            videoUrl: uploadData.videoUrl,
            filename: file.name,
            mimeType: file.type || 'video/mp4',
            prompt:
              prompt ||
              'Analyse this motorcycle footage for the best cinematic moments, camera movement, action and editing opportunities.'
          })
        }
      );

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned an invalid response: ${text.slice(
            0,
            300
          )}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Server error ${response.status}`
        );
      }

      if (!data?.analysis) {
        throw new Error(
          'Gemini returned no analysis.'
        );
      }

      setAnalysis(data.analysis);

      setStatus(
        '✅ Gemini has analysed the actual video.'
      );
    } catch (error) {
      console.error(
        'Video analysis error:',
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
    setAnalysis(null);
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>BIKEZTAGRAM AI</h1>

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
              setPrompt(event.target.value)
            }
            disabled={loading}
            placeholder="Analyse this motorcycle footage for the strongest cinematic moments, camera movement, action, composition and best timestamps for an exciting social-media motorcycle trailer."
          />
        </section>

        <div className="button-row">
          <button
            className="generate-btn"
            onClick={analyseVideo}
            disabled={loading || !file}
          >
            {loading
              ? '🎬 Gemini Is Watching...'
              : '👁️ Analyse Actual Video'}
          </button>

          {file && !loading && (
            <button
              className="clear-btn"
              onClick={clearAll}
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
          </div>
        )}

        {analysis && (
          <section className="result-container">
            <h2>
              Gemini Video Analysis
            </h2>

            <div className="status-panel">
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  textAlign: 'left',
                  wordBreak: 'break-word'
                }}
              >
                {typeof analysis === 'string'
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
