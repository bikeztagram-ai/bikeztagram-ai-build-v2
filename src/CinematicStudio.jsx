import React, { useEffect, useRef, useState } from 'react';
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
  const controllerRef = useRef(null);
  const objectUrlsRef = useRef([]);

  useEffect(() => () => {
    controllerRef.current?.abort();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function clearPreviewUrls() {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }

  function makeShots(referenceAssets) {
    const styles = ['wide establishing shot, low camera, cinematic reveal', 'dynamic tracking shot beside the motorcycle, controlled motion blur', 'hero closing shot, dramatic push-in, premium trailer composition', 'sweeping aerial-style pursuit shot, environment reveal', 'slow dramatic pass-by, strong foreground and background separation'];
    return Array.from({ length: Math.max(1, Math.min(5, Number(shotCount) || 3)) }, (_, index) => ({
      id: `shot-${index + 1}`, duration: 4, aspectRatio: '16:9', referenceAssets,
      generationPrompt: `${brief.trim()} Shot ${index + 1}: ${styles[index % styles.length]}. Preserve the exact identity, colours, proportions and visible details of the rider and motorcycle from the supplied references. Original game-inspired world; do not reproduce copyrighted characters, logos or locations.`,
      continuity: { riderAndBike: 'preserve identity and motorcycle appearance across shots', previousShot: index > 0 ? `shot-${index}` : null },
    }));
  }

  async function uploadReferences(signal) {
    if (!files.length) return [];
    setUploading(true);
    try {
      const uploaded = [];
      for (const [index, file] of files.entries()) {
        if (signal?.aborted) throw new DOMException('Generation cancelled.', 'AbortError');
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const blob = await upload(`cinematic-references/${Date.now()}-${index}-${safeName}`, file, {
          access: 'public', handleUploadUrl: '/api/upload', multipart: false,
          abortSignal: signal,
          clientPayload: JSON.stringify({ source: 'bikeztagram-cinematic-studio', filename: file.name, mimeType: file.type, size: file.size }),
        });
        uploaded.push(blob.url);
      }
      setAssets(uploaded); return uploaded;
    } finally { setUploading(false); }
  }

  async function generate() {
    if (controllerRef.current) return;
    clearPreviewUrls();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'preparing', progress: 0, results: [], error: null });
    try {
      const referenceAssets = assets.length ? assets : await uploadReferences(controller.signal);
      const shots = makeShots(referenceAssets);
      const next = await runCinematicProduction({ shots, referenceAssets, continuity: shots[0]?.continuity, signal: controller.signal, onState: setState });
      if (controller.signal.aborted) return;
      const results = next.results.map((result) => ({ ...result, url: result.blob ? URL.createObjectURL(result.blob) : '' }));
      objectUrlsRef.current = results.map((result) => result.url).filter(Boolean);
      setState({ ...next, results });
    } catch (error) {
      if (error?.name === 'AbortError') setState((s) => ({ ...s, status: 'cancelled', currentShot: null, error: 'Generation cancelled. No further shots were queued.' }));
      else setState((s) => ({ ...s, status: 'error', error: error?.message || String(error) }));
    } finally { controllerRef.current = null; }
  }

  function cancel() {
    controllerRef.current?.abort();
  }

  const busy = uploading || ['preparing', 'generating'].includes(state.status);

  return <main style={{ maxWidth: 1000, margin: '0 auto', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
    <header><div style={{ fontSize: 13, opacity: .65, letterSpacing: 1.5 }}>BIKEZTAGRAM AI • CINEMATIC STUDIO</div><h1>Turn your rider + bike references into a trailer.</h1><p style={{ opacity: .75 }}>Direct £0-only generation path. Upload references, describe the film, and generate shots sequentially with continuity. Failed or cancelled runs stop before another shot is queued.</p></header>
    <section style={{ display: 'grid', gap: 16 }}>
      <label>Rider / bike photos or videos<input type="file" multiple accept="image/*,video/*" disabled={busy} onChange={(e) => { setFiles(Array.from(e.target.files || [])); setAssets([]); }} style={{ display: 'block', marginTop: 8 }} /></label>
      <label>Cinematic brief<textarea value={brief} disabled={busy} onChange={(e) => setBrief(e.target.value)} rows={5} style={{ display: 'block', width: '100%', marginTop: 8 }} /></label>
      <label>Shots<select value={shotCount} disabled={busy} onChange={(e) => setShotCount(Number(e.target.value))} style={{ display: 'block', marginTop: 8 }}><option value={1}>1 — fastest proof</option><option value={2}>2 — short sequence</option><option value={3}>3 — trailer</option><option value={4}>4 — extended trailer</option><option value={5}>5 — full sequence</option></select></label>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={generate} disabled={busy || !!controllerRef.current}>{state.status === 'generating' ? `Generating… ${state.progress}%` : 'Generate cinematic trailer'}</button>
        {busy && <button onClick={cancel} type="button">Cancel generation</button>}
      </div>
      {state.status === 'cancelled' && <div>⏹️ Generation stopped. The queue is clear and no later shots were started.</div>}
      {state.status === 'complete' && <div>✅ {state.results.length} shot{state.results.length === 1 ? '' : 's'} generated.</div>}
      {state.status === 'error' && <pre style={{ whiteSpace: 'pre-wrap' }}>❌ {state.error}</pre>}
    </section>
    {state.results?.length > 0 && <section style={{ marginTop: 32, display: 'grid', gap: 24 }}><h2>Generated shots</h2>{state.results.map((result) => <article key={result.id || result.index}><h3>{result.id || `Shot ${result.index + 1}`}</h3><video controls playsInline src={result.url || ''} style={{ width: '100%', borderRadius: 12 }} /></article>)}</section>}
  </main>;
}
