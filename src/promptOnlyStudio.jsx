/* BIKEZTAGRAM AI — prompt-only production studio. Turns an idea into a real generated film without uploaded media. */
import React, { useEffect, useMemo, useState } from 'react';
import { createPromptOnlyEditPlan } from './promptOnlyDirector.js';
import { renderUniversalProduction } from './universalRenderRuntime.js';
import { resolveOutputPreset } from './outputPresets.js';

const DEFAULT_PROMPT = 'Create a cinematic film about a lone rider crossing a neon city in heavy rain, starting mysterious, building tension, then exploding into a fast pursuit before ending on a powerful hero shot.';
const PRESETS = ['portrait', 'landscape', 'square', 'cinema'];

export default function PromptOnlyStudio() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [preset, setPreset] = useState('portrait');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [provider, setProvider] = useState('');
  const [allowPaidVideo, setAllowPaidVideo] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  useEffect(() => { let active = true; fetch('/api/video').then((r) => r.json()).then((data) => { if (active) setCapabilities(data); }).catch(() => { if (active) setCapabilities({ providers: {} }); }); return () => { active = false; }; }, []);
  const output = useMemo(() => resolveOutputPreset(preset, prompt), [preset, prompt]);

  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  async function createFilm() {
    if (!prompt.trim() || busy) return;
    setBusy(true); setError(''); setStatus('Understanding the idea and directing the scenes...'); setProgress(3); setProvider('');
    try {
      const plan = createPromptOnlyEditPlan(prompt.trim(), { targetDuration: 15, outputPreset: preset });
      setStatus(`Directed ${plan.cuts.length} original scenes. Generating real AI footage...`);
      const production = await renderUniversalProduction({
        mediaItems: [], plan, prompt: prompt.trim(), duration: plan.targetDuration || 15,
        music: true, outputPreset: preset, allowPaidVideo,
        onProgress: (event) => {
          if (event?.stage === 'ai-video') setProgress(Math.max(5, Math.min(72, Math.round(Number(event.value) || 0) * .68)));
          if (event?.stage === 'ai-video-complete') { setProvider(event.provider || 'AI video'); setStatus('AI scenes complete. Building music, edit and final render...'); }
          if (event?.stage === 'render') { setProgress(72 + Math.round((Number(event.value) || 0) * .28)); setStatus(`Rendering final film... ${Math.round(Number(event.value) || 0)}%`); }
        },
      });
      if (!(production?.output instanceof Blob) || !production.output.size) throw new Error('The production runtime returned no usable film.');
      setResultUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(production.output); });
      setProvider(production.aiVideo?.provider || 'AI video');
      setProgress(100);
      setStatus(production.accepted === false ? 'Film rendered. QA has requested a further improvement pass.' : 'Finished film created and checked.');
    } catch (e) {
      setError(e?.message || String(e));
      setStatus('Generation stopped safely.');
    } finally { setBusy(false); }
  }

  return <section className="glass-card prompt-only-studio" aria-label="Create a film from an idea">
    <div className="section-title"><span>AI</span><h3>Create from any idea</h3><em>NO MEDIA REQUIRED</em></div>
    <p className="prompt-only-copy">Start with an idea, story, advert, scene, world or character. Bikeztagram turns the brief into directed shots, generates real moving footage, creates the soundtrack and assembles the finished film.</p>
    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={busy} aria-label="Creative idea" />
    <div className="provider-readiness" role="status"><strong>Video provider status</strong><small>{capabilities?.providers?.runway?.configured ? "Runway is configured; it is a paid provider." : "Runway is not configured."} Free AI provider: not connected yet. The local procedural renderer does not use an AI video model.</small></div>
    <label className="paid-video-consent"><input type="checkbox" checked={allowPaidVideo} onChange={(e) => setAllowPaidVideo(e.target.checked)} disabled={busy} /> Allow paid Runway video generation for this film. The provider may charge for each generated shot.</label>
    <div className="prompt-only-controls">
      <label>FORMAT <select value={preset} onChange={(e) => setPreset(e.target.value)} disabled={busy}>{PRESETS.map((id) => <option key={id} value={id}>{resolveOutputPreset(id).label}</option>)}</select></label>
      <button className="primary-cta" onClick={createFilm} disabled={busy || !prompt.trim()}>{busy ? `◌ CREATING ${progress}%` : '✦ CREATE REAL AI FILM'}</button>
    </div>
    {busy && <div className="progress"><i style={{ width: `${progress}%` }} /></div>}
    {status && <div className="status-panel"><strong>{status}</strong>{provider && <small>Provider: {provider} • {output.label}</small>}</div>}
    {error && <div className="error-panel"><strong>Generation error</strong><p>{error}</p></div>}
    {resultUrl && <div className="prompt-only-result"><video className="film-preview" src={resultUrl} controls playsInline /><small>Real generated video • original soundtrack • automatic QA</small></div>}
  </section>;
}
