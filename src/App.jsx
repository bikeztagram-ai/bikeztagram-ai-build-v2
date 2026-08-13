import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';
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
      setStatus('Uploading video directly to Vercel Blob...');

      const blob = await upload(
        `videos/${Date.now()}-${file.name}`,
        file,
        {
          access: 'private',
          handleUploadUrl: '/api/upload',
          contentType: file.type || 'video/mp4'
        }
      );

      if (!blob?.url) {
        throw new Error(
          'Vercel Blob did not return a video URL.'
        );
      }

      setStatus(
        '✅ Video uploaded. Sending it to Gemini...'
      );

      const response = await fetch(
        '/api/analyse',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            videoUrl: blob.url,
            filename: file.name,
            mimeType:
              file.type || 'video/mp4',
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
            disabled={
              loading || !file
            }
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
                  whiteSpace:
                    'pre-wrap',
                  margin: 0,
                  textAlign: 'left',
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
