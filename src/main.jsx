import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { scoreMedia } from './director';
import { renderProject } from './renderer';
import './styles.css';

function App() {
  const [media, setMedia] = useState([]);
  const [progress, setProgress] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newMedia = files.map((file, idx) => {
      const item = {
        id: `media-${Date.now()}-${idx}`,
        name: file.name,
        type: file.type,
        file: file,
        duration: 5
      };
      item.score = scoreMedia(item);
      return item;
    });
    setMedia((prev) => [...prev, ...newMedia]);
  };

  const handleRender = async () => {
    if (!media.length) return alert('Please upload some photos or videos first!');
    setRendering(true);
    setProgress(0);

    const cuts = media.map((m) => ({
      mediaId: m.id,
      start: 0,
      duration: 3
    }));

    const plan = {
      cuts,
      duration: cuts.length * 3,
      version: 1
    };

    try {
      const blob = await renderProject(media, plan, (p) => setProgress(p));
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (err) {
      console.error(err);
      alert('Error rendering video: ' + err.message);
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="container">
      <h1>BIKEZTAGRAM AI BUILD</h1>
      
      <div className="card">
        <label className="btn-upload">
          Upload Clips & Photos
          <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} hidden />
        </label>
        <p>{media.length} items loaded</p>
      </div>

      {media.length > 0 && (
        <div className="card">
          <button className="btn-render" onClick={handleRender} disabled={rendering}>
            {rendering ? `Rendering (${progress}%)` : 'Generate Reel'}
          </button>
        </div>
      )}

      {videoUrl && (
        <div className="card">
          <h2>Your Reel</h2>
          <video src={videoUrl} controls width="100%" style={{ maxHeight: '500px', borderRadius: '8px' }} />
          <a href={videoUrl} download="bikeztagram-reel.mp4" className="btn-download">
            Download Video
          </a>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
