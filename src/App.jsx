import React, { useState } from 'react';
import './styles.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile =
      event.target.files?.[0] || null;

    setFile(selectedFile);
    setAnalysis(null);

    if (selectedFile) {
      const sizeMB =
        selectedFile.size / (1024 * 1024);

      setStatus(
        `Loaded: ${selectedFile.name} (${sizeMB.toFixed(1)} MB)`
      );
    } else {
      setStatus('');
    }
  };

  const analyseVideo = async () => {
    if (!file) {
      setStatus('Please select a video first.');
      return;
    }

    if (!file.type.startsWith('video/')) {
      setStatus('Please upload a video clip.');
      return;
    }

    setIsProcessing(true);
    setAnalysis(null);

    try {
      setStatus('Preparing your video...');

      /*
       * IMPORTANT:
       *
       * We are NOT converting the video to base64.
       *
       * The video is sent as multipart/form-data.
       * This avoids the Vercel FUNCTION_PAYLOAD_TOO_LARGE
       * error caused by sending a huge base64 JSON request.
       */

      const formData = new FormData();

      formData.append('video', file);
      formData.append(
        'prompt',
        prompt ||
          'Analyse this motorcycle footage for the strongest cinematic moments, camera movement, action, composition and best timestamps for an exciting social-media motorcycle trailer.'
      );

      formData.append(
        'filename',
        file.name
      );

      formData.append(
        'mimeType',
        file.type || 'video/mp4'
      );

      setStatus(
        'Uploading video for Gemini analysis...'
      );

      const response = await fetch(
        '/api/analyse',
        {
          method: 'POST',
          body: formData
        }
      );

      const responseText =
        await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `The analysis server returned an invalid response: ${
            responseText.slice(0, 300) ||
            'Empty response'
          }`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Analysis server error (${response.status})`
        );
      }

      if (!data?.analysis) {
        throw new Error(
          'Gemini did not return an analysis.'
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
      setIsProcessing(false);
    }
  };

  const clearTest = () => {
    setFile(null);
    setPrompt('');
    setStatus('');
    setAnalysis(null);
  };

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
          <label htmlFor="media-upload">
            Test motorcycle footage
          </label>

          <input
            id="media-upload"
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={isProcessing}
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
            rows={5}
            value={prompt}
            onChange={(event) =>
              setPrompt(event.target.value)
            }
            disabled={isProcessing}
            placeholder="Analyse this motorcycle footage for the strongest cinematic moments, camera movement, action, composition and best timestamps for an exciting social-media motorcycle trailer."
          />
        </section>

        <div className="button-row">
          <button
            onClick={analyseVideo}
            disabled={
              isProcessing || !file
            }
            className="generate-btn"
          >
            {isProcessing
              ? '🎬 Gemini Is Watching...'
              : '👁️ Analyse Actual Video'}
          </button>

          {file && !isProcessing && (
            <button
              onClick={clearTest}
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
          </div>
        )}

        {analysis && (
          <section className="result-container">
            <h2>
              Gemini Video Analysis
            </h2>

            <div
              className="status-panel"
              style={{
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                wordBreak: 'break-word'
              }}
            >
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  lineHeight: '1.5'
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
