import React, { useMemo, useState } from 'react';
import { renderProject } from './renderer';
import { scoreMedia } from './director';
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
    const selectedFiles = Array.from(event.target.files || []);

    setFiles(selectedFiles);
    setVideoUrl(null);
    setProgress(0);

    if (selectedFiles.length > 0) {
      setStatus(
        `${selectedFiles.length} clip${selectedFiles.length === 1 ? '' : 's'} loaded.`
      );
    } else {
      setStatus('');
    }
  };

  const buildEditPlan = () => {
    /*
     * Score the uploaded media so the best clips are considered first.
     * This is the foundation for the AI Director.
     */
    const scored = mediaItems
      .map((media, index) => ({
        ...media,
        originalIndex: index,
        score: scoreMedia(media)
      }))
      .sort((a, b) => b.score - a.score);

    const totalDuration = Math.max(
      8,
      Math.min(30, 2.5 * scored.length)
    );

    const clipDuration =
      totalDuration / Math.max(scored.length, 1);

    const cuts = scored.map((media, index) => {
      const transitions = [
        'zoom-in',
        'pan-right',
        'zoom-out',
        'pan-left'
      ];

      return {
        mediaIndex: media.originalIndex,
        mediaId: media.id,
        duration: Math.max(1.5, clipDuration),
        transition: transitions[index % transitions.length],
        motionStyle: transitions[index % transitions.length],
        text:
          index === 0
            ? 'NINJA 1000SX'
            : ''
      };
    });

    return {
      title: 'Bikeztagram AI Reel',
      prompt,
      cuts,
      colorGrade: prompt.toLowerCase().includes('dark')
        ? 'moody-blue'
        : 'dark-cinematic',
      textOverlay: 'NINJA 1000SX'
    };
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
      setStatus('Please upload at least one image or video clip.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setVideoUrl(null);

    try {
      setStatus('Analysing your clips...');

      /*
       * Give the media a moment to be analysed before rendering.
       */
      await new Promise((resolve) => setTimeout(resolve, 300));

      const editPlan = buildEditPlan();

      setStatus(
        `AI Director selected ${editPlan.cuts.length} clips. Rendering...`
      );

      const videoBlob = await renderProject(
        mediaItems,
        editPlan,
        (percentage) => {
          setProgress(Math.round(percentage));
        }
      );

      const url = URL.createObjectURL(videoBlob);

      setVideoUrl(url);
      setProgress(100);
      setStatus('Your reel is ready!');
    } catch (error) {
      console.error('Generation error:', error);

      setStatus(
        `Something went wrong: ${
          error?.message || 'Unknown error'
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
          <p>AI-powered motorcycle video editor</p>
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
              {files.length === 1 ? '' : 's'} loaded
            </p>
          )}
        </section>

        <section className="form-group">
          <label htmlFor="edit-prompt">
            Tell the AI what you want
          </label>

          <textarea
            id="edit-prompt"
            rows={4}
            value={prompt}
            onChange={(event) =>
              setPrompt(event.target.value)
            }
            disabled={isProcessing}
            placeholder="Example: Make a dark, cinematic Kawasaki Ninja reel with fast cuts, dramatic movement and a powerful reveal."
          />
        </section>

        <div className="button-row">
          <button
            onClick={handleGenerate}
            disabled={
              isProcessing || files.length === 0
            }
            className="generate-btn"
          >
            {isProcessing
              ? `Creating Reel ${progress}%`
              : '✨ Create AI Reel'}
          </button>

          {(files.length > 0 || videoUrl) && !isProcessing && (
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
            <p className="status-text">{status}</p>

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
              download="bikeztagram-ai-reel.mp4"
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
