import React, { useMemo, useState } from 'react';
import { renderProject } from './renderer';
import './styles.css';

export default function App() {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaItems = useMemo(() => {
    return files.map((file, index) => ({
      id: index,
      file,
      type: file.type,
      name: file.name,
      size: file.size
    }));
  }, [files]);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    setFiles(selectedFiles);
    setVideoUrl(null);
    setProgress(0);

    if (selectedFiles.length > 0) {
      setStatus(
        `${selectedFiles.length} clip${
          selectedFiles.length === 1 ? '' : 's'
        } loaded.`
      );
    } else {
      setStatus('');
    }
  };

  const createAIEditPlan = async () => {
    const media = mediaItems.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      size: item.size
    }));

    const response = await fetch('/api/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt:
          prompt ||
          'Create an epic cinematic motorcycle trailer.',
        media
      })
    });

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        `AI server returned an invalid response: ${
          responseText.slice(0, 200) ||
          'Empty response'
        }`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          `AI server error (${response.status})`
      );
    }

    if (!data?.plan) {
      throw new Error(
        'The AI server did not return an edit plan.'
      );
    }

    return data.plan;
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
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
        'AI Director is analysing your request...'
      );

      const editPlan =
        await createAIEditPlan();

      if (
        !editPlan.cuts ||
        !Array.isArray(editPlan.cuts) ||
        editPlan.cuts.length === 0
      ) {
        throw new Error(
          'The AI created an empty edit plan.'
        );
      }

      setStatus(
        `AI Director created ${editPlan.cuts.length} shots. Rendering...`
      );

      const videoBlob =
        await renderProject(
          mediaItems,
          editPlan,
          (percentage) => {
            setProgress(
              Math.round(percentage)
            );
          }
        );

      if (!videoBlob || videoBlob.size === 0) {
        throw new Error(
          'The renderer produced an empty video.'
        );
      }

      const url =
        URL.createObjectURL(videoBlob);

      setVideoUrl(url);
      setProgress(100);
      setStatus(
        'Your AI-directed cinematic reel is ready!'
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

  const clearProject = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
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
          <h1>BIKEZTAGRAM AI</h1>

          <p>
            AI-powered motorcycle video editor
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
            onChange={handleFileChange}
            disabled={isProcessing}
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
              setPrompt(event.target.value)
            }
            disabled={isProcessing}
            placeholder="Example: Create an epic cinema-grade Kawasaki Ninja 1000SX launch trailer. Start mysterious, build tension, reveal the bike, then finish with fast aggressive riding footage."
          />
        </section>

        <div className="button-row">
          <button
            onClick={handleGenerate}
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
                onClick={clearProject}
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
                    width: `${progress}%`
                  }}
                />
              </div>
            )}
          </div>
        )}

        {videoUrl && (
          <section className="result-container">
            <h2>Your Completed Reel</h2>

            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="video-preview"
            />

            <a
              href={videoUrl}
              download="bikeztagram-ai-reel.webm"
              className="download-btn"
            >
              Download Reel
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
