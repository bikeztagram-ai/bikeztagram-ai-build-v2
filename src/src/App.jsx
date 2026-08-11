import React, { useState } from 'react';
import { renderProject } from './renderer';

export default function App() {
  const [media, setMedia] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const items = files.map((file, idx) => ({
      id: `m_${Date.now()}_${idx}`,
      file,
      name: file.name,
      type: file.type
    }));
    setMedia((prev) => [...prev, ...items]);
  };

  const handleGenerate = async () => {
    if (!media.length) return alert('Please upload at least one photo or video.');
    
    setIsRendering(true);
    setStatus('Contacting cloud renderer...');
    setProgress(10);

    try {
      // 1. Call Vercel Serverless Function
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mediaCount: media.length })
      });

      const cloudData = await response.json();
      if (!cloudData.success) throw new Error(cloudData.error || 'Cloud API error');

      setStatus(`Applying prompt: "${cloudData.config.promptApplied}"...`);

      // 2. Build cut plan based on server response
      const cutDuration = cloudData.config.cutDuration;
      const cuts = media.map((m) => ({
        mediaId: m.id,
        start: 0,
        duration: cutDuration
      }));

      const plan = {
        duration: cuts.length * cutDuration,
        version: Date.now(),
        cuts
      };

      // 3. Render video
      setStatus('Rendering reel...');
      const blob = await renderProject(media, plan, (p) => setProgress(p));
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus('Render complete!');
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px', color: '#fff', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>BIKEZTAGRAM AI BUILD</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
          Upload Clips & Photos ({media.length} loaded)
        </label>
        <input 
          type="file" 
          multiple 
          accept="image/*,video/*" 
          onChange={handleFileChange} 
          style={{ width: '100%', padding: '10px', background: '#222', borderRadius: '8px', color: '#fff' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
          Edit Prompt / Instructions
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Fast action cut, focus on the blue Ninja, upbeat tempo..."
          style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isRendering || !media.length}
        style={{
          width: '100%',
          padding: '14px',
          background: isRendering ? '#444' : '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          fontSize: '16px',
          cursor: isRendering ? 'not-allowed' : 'pointer'
        }}
      >
        {isRendering ? `Processing (${progress}%)` : 'Generate Reel'}
      </button>

      {status && <p style={{ marginTop: '15px', fontSize: '14px', color: '#aaa' }}>{status}</p>}

      {videoUrl && (
        <div style={{ marginTop: '25px' }}>
          <h3 style={{ marginBottom: '10px' }}>Your Completed Reel:</h3>
          <video src={videoUrl} controls style={{ width: '100%', borderRadius: '12px' }} />
          <a
            href={videoUrl}
            download="bikeztagram-reel.mp4"
            style={{ display: 'block', marginTop: '10px', textAlign: 'center', color: '#0070f3', textDecoration: 'none', fontWeight: 'bold' }}
          >
            Download Video MP4
          </a>
        </div>
      )}
    </div>
  );
}
