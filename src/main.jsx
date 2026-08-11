import React, { useState } from 'react';
import { renderProject } from './renderer';
import './styles.css';

export default function App() {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
      setStatus('Please upload at least one image or video clip.');
      return;
    }

    setIsProcessing(true);
    setStatus('Analyzing prompt with AI Director...');
    setProgress(0);
    setVideoUrl(null);

    try {
      // Send lightweight metadata count to avoid payload size limit
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          mediaFilesCount: files.length
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate edit plan.');
      }

      setStatus('Rendering reel with motion effects & color grading...');

      // Prepare media items for renderer
      const mediaItems = files.map((file, index) => ({
        id: index,
        file: file,
        type: file.type
      }));

      // Render locally on canvas using AI plan
      const videoBlob = await renderProject(mediaItems, data.plan, (p) => setProgress(p));
      const url = URL.createObjectURL(videoBlob);
      
      setVideoUrl(url);
      setStatus('Render complete!');
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <h1>BIKEZTAGRAM AI BUILD</h1>

      <div className="form-group">
        <label>Upload Clips & Photos ({files.length} loaded)</label>
        <input 
          type="file" 
          multiple 
          accept="image/*,video/*" 
          onChange={handleFileChange} 
        />
      </div>

      <div className="form-group">
        <label>Edit Prompt / Instructions</label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Make a sexy cinematic dark and gloomy video of around 15 seconds long..."
        />
      </div>

      <button 
        onClick={handleGenerate} 
        disabled={isProcessing}
        className="generate-btn"
      >
        {isProcessing ? `Processing (${progress}%)` : 'Generate Reel'}
      </button>

      {status && <p className="status-text">{status}</p>}

      {videoUrl && (
        <div className="result-container">
          <h3>Your Completed Reel:</h3>
          <video src={videoUrl} controls autoPlay loop playsInline className="video-preview" />
          <br />
          <a href={videoUrl} download="bikeztagram-reel.mp4" className="download-btn">
            Download Video MP4
          </a>
        </div>
      )}
    </div>
  );
}
