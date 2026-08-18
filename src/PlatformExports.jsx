import React, { useMemo, useState } from 'react';
import { DEFAULT_PLATFORMS, buildPlatformExportReadiness, exportMasterToPlatforms } from './platformExportController.js';

export default function PlatformExports({ masterBlob, disabled = false, onStatus }) {
  const [selected, setSelected] = useState(['reels']);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const readiness = useMemo(() => buildPlatformExportReadiness(masterBlob, selected), [masterBlob, selected]);

  function toggle(platform) {
    setSelected((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]);
    setResults([]);
    setError('');
  }

  async function exportSelected() {
    if (!readiness.valid) return;
    setRunning(true);
    setError('');
    setResults([]);
    onStatus?.('Preparing selected platform outputs in the browser...');
    try {
      const output = await exportMasterToPlatforms(masterBlob, selected);
      setResults(output.results);
      onStatus?.(`✅ ${output.results.length} platform output${output.results.length === 1 ? '' : 's'} ready.`);
    } catch (err) {
      const message = err?.message || String(err);
      setError(message);
      onStatus?.(`❌ Platform export failed — ${message}`);
    } finally {
      setRunning(false);
    }
  }

  function download(result) {
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bikeztagram-${result.platform}.mp4`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return <section className="result-container" style={{ marginTop: '20px' }}>
    <h2>📱 Platform Outputs</h2>
    <div className="status-panel">
      <p>Convert the completed cinematic master locally. The edit and original source timing are preserved.</p>
      <div className="button-row" style={{ flexWrap: 'wrap' }}>
        {DEFAULT_PLATFORMS.map((platform) => {
          const item = readiness.platforms.find((entry) => entry.platform === platform);
          const checked = selected.includes(platform);
          return <button key={platform} className={checked ? 'generate-btn' : 'clear-btn'} disabled={disabled || running} onClick={() => toggle(platform)}>
            {checked ? '✓ ' : ''}{item?.label || platform}
          </button>;
        })}
      </div>
      {error && <p style={{ marginTop: '10px' }}>❌ {error}</p>}
      <button className="generate-btn" style={{ marginTop: '12px' }} disabled={disabled || running || !readiness.valid} onClick={exportSelected}>
        {running ? '⏳ Creating platform videos...' : '🎞️ Create Selected Videos'}
      </button>
      {results.length > 0 && <div style={{ marginTop: '15px' }}>
        {results.map((result) => <div key={result.platform} className="status-panel" style={{ marginTop: '8px' }}>
          <strong>{result.label}</strong> — {result.profile.width}×{result.profile.height} • MP4
          <button className="generate-btn" style={{ marginLeft: '10px' }} onClick={() => download(result)}>⬇️ Download</button>
        </div>)}
      </div>}
    </div>
  </section>;
}
