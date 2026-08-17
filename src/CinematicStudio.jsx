import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';
import { runCinematicProduction } from './cinematicProductionController.js';

const DEFAULT_BRIEF = 'Create a cinematic open-world motorcycle trailer with dramatic night lighting, sweeping camera movement, realistic road detail and a premium game-trailer feel. Keep the rider and motorcycle visually consistent across every shot.';

export default function CinematicStudio() {
  const [files, setFiles] = useState([]);
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [shotCount, setShotCount] = useState(3);
  const [state, setState] = useState({ status: 'idle', progress: 0, results: [], error: null });
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);

  function makeShots(referenceAssets) {
    const styles = ['wide establishing shot, low camera, cinematic reveal', 'dynamic tracking shot beside the motorcycle, controlled motion blur', 'hero closing shot, dramatic push-in, premium trailer composition', 'sweeping aerial-style pursuit shot, environment reveal', 'slow dramatic pass-by, strong foreground and background separation'];
    return Array.from({ length: Math.max(1, Math.min(5, Number(shotCount) || 3)) }, (_, index) => ({
      id: `shot-${index + 1}`, duration: 4, aspectRatio: '16:9', referenceAssets,
      generationPrompt: `${brief.trim()} Shot ${index + 1}: ${styles[index % styles.length]}. Preserve the exact identity, colours, proportions and visible details of the rider and motorcycle from the supplied references. Original game-inspired world; do not reproduce copyrighted characters, logos or locations.`,
      continuity: { riderAndBike: 'preserve identity and motorcycle appearance across shots', previousShot: index > 0 ? `shot-${index}` : null },
    }));
  }

  async function uploadReferences() {
    if (!files.length) return [];
    setUploading(true);
    try {
      const uploaded = [];
      for (const [index, file] of files.entries()) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const blob = await upload(`cinematic-references/${Date.now()}-${index}-${safeName}`, file, {
          access: 'public', handleUploadUrl: '/api/upload', multipart: false,
          clientPayload: JSON.stringify({ source: 'bikeztagram-cinematic-studio', filename: file.name, mimeType: file.type, size: file.size }),
        });
        uploaded.push(blob.url);
      }
      setAssets(uploaded); return uploaded;
    } finally { setUploading(false); }
  }

  async function generate() {
    setState({ status: 'preparing', progress: 0, results: [], error: null });
    try {
      const referenceAssets = assets.length ? assets : await uploadReferences();
      const shots = makeShots(referenceAssets);
      const next = await runCinematicProduction({ shots, referenceAssets, continuity: shots[0]?.continuity, onState: setState });
      setState(next);
    } catch (error) { setState((s) => ({ ...s, status: 'error', error: error?.message || String(error) })); }
  }

  return <main style={{ maxWidth: 1000, margin: '0 auto', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
    <header><div style={{ fontSize: 13, opacity: .65, letterSpacing: 1.5 }}>BIKEZTAGRAM AI • CINEMATIC STUDIO</div><h1>Turn your rider + bike references into a trailer.</h1><p style={{ opacity: .75 }}>Direct £0-only generation path. Upload references, describe the film, and generate shots sequentially with continuity.</p></header>
    <section style={{ display: 'grid', gap: 16 }}>
      <label>Rider / bike photos or videos<input type="file" multiple accept="image/*,video/*" onChange={(e) => { setFiles(Array.from(e.target.files || [])); setAssets([]); }} style={{ display: 'block', marginTop: 8 }} /></label>
      <label>Cinematic brief<textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} style={{ display: 'block', width: '100%', marginTop: 8 }} /></label>
      <label>Shots<select value={shotCount} onChange={(e) => setShotCount(Number(e.target.value))} style={{ display: 'block', marginTop: 8 }}><option value={1}>1 — fastest proof</option><option value={2}>2 — short sequence</option><option value={3}>3 — trailer</option><option value={4}>4 — extended trailer</option><option value={5}>5 — full sequence</option></select></label>
      <button onClick={generate} disabled={uploading || ['preparing', 'generating'].includes(state.status)}>{state.status === 'generating' ? `Generating… ${state.progress}%` : 'Generate cinematic trailer'}</button>
      {state.status === 'complete' && <div>✅ {state.results.length} shot{state.results.length === 1 ? '' : 's'} generated.</div>}
      {state.status === 'error' && <pre style={{ whiteSpace: 'pre-wrap' }}>❌ {state.error}</pre>}
    </section>
    {state.results?.length > 0 && <section style={{ marginTop: 32, display: 'grid', gap: 24 }}><h2>Generated shots</h2>{state.results.map((result) => <article key={result.shot?.id || result.index}><h3>{result.shot?.id || `Shot ${result.index + 1}`}</h3><video controls playsInline src={result.url || (result.blob ? URL.createObjectURL(result.blob) : '')} style={{ width: '100%', borderRadius: 12 }} /></article>)}</section>}
  </main>;
}
