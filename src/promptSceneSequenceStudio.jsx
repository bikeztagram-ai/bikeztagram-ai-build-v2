import React, { useEffect, useMemo, useState } from 'react';
import { generateProceduralSceneV2 } from './proceduralSceneGeneratorV2.js';

const SHOTS = [
  ['HOOK', 'Establish the world, mood and visual question.'],
  ['BUILD', 'Escalate movement, scale or anticipation.'],
  ['HERO', 'Deliver the strongest final visual beat.']
];

const shell = {
  marginTop: 18,
  padding: 18,
  borderRadius: 18,
  border: '1px solid rgba(110,216,255,.18)',
  background: 'linear-gradient(145deg, rgba(8,18,28,.96), rgba(4,9,15,.96))',
  boxShadow: '0 18px 50px rgba(0,0,0,.25)'
};

const cleanName = value => String(value || 'scene').replace(/[^a-z0-9._-]+/gi, '-').slice(0, 48);

export default function PromptSceneSequenceStudio() {
  const [prompt, setPrompt] = useState('Create an original cinematic motorcycle-commercial world at night with atmospheric depth, premium lighting and a powerful reveal.');
  const [duration, setDuration] = useState(4);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [scenes, setScenes] = useState([]);

  useEffect(() => () => scenes.forEach(scene => scene.url && URL.revokeObjectURL(scene.url)), [scenes]);

  const totalDuration = useMemo(() => scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0), [scenes]);

  async function generateSequence() {
    if (!prompt.trim()) return setStatus('Describe the world first.');
    setBusy(true);
    setProgress(0);
    setStatus('Building a three-shot original sequence locally…');
    const previous = scenes;
    previous.forEach(scene => scene.url && URL.revokeObjectURL(scene.url));
    setScenes([]);
    try {
      const generated = [];
      for (let index = 0; index < SHOTS.length; index += 1) {
        const [role, direction] = SHOTS[index];
        const scenePrompt = `${prompt.trim()}\n\nShot role: ${role}. ${direction} Keep this visually distinct from the other shots while preserving the same world, subject and palette. Original procedural visuals only.`;
        const result = await generateProceduralSceneV2({
          prompt: scenePrompt,
          purpose: `three-shot-sequence-${role.toLowerCase()}`,
          duration,
          width: 720,
          height: 1280,
          title: role,
          onProgress: value => setProgress(Math.round(((index + Number(value || 0) / 100) / SHOTS.length) * 100))
        });
        generated.push({ ...result, role, direction });
        setScenes([...generated]);
      }
      setProgress(100);
      setStatus(`Sequence ready • ${generated.length} shots • ${totalSeconds(generated)}s total`);
    } catch (error) {
      console.error('[PROMPT SEQUENCE]', error);
      generatedCleanup(scenes);
      setScenes([]);
      setStatus(`Generation stopped — ${error?.message || String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function addToFilm() {
    if (!scenes.length) return setStatus('Generate the sequence first.');
    const input = document.querySelector('#media-file');
    if (!(input instanceof HTMLInputElement)) return setStatus('Film media input is not available yet.');
    if (typeof DataTransfer === 'undefined') return setStatus('This browser cannot add generated scenes to the media library.');
    const transfer = new DataTransfer();
    for (const file of Array.from(input.files || [])) transfer.items.add(file);
    if (transfer.items.length + scenes.length > 12) return setStatus(`The film library can hold 12 sources. Remove ${transfer.items.length + scenes.length - 12} source${transfer.items.length + scenes.length - 12 === 1 ? '' : 's'} first.`);
    scenes.forEach((scene, index) => transfer.items.add(new File([scene.blob], `${cleanName(scene.role)}-${Date.now()}-${index}.webm`, { type: scene.blob.type || 'video/webm' })));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus(`✓ Added ${scenes.length} original sequence shots to the film library.`);
  }

  function exportShot(scene) {
    if (!scene?.blob) return;
    const url = URL.createObjectURL(scene.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${cleanName(scene.role)}-original-scene-${scene.width}x${scene.height}.webm`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clear() {
    generatedCleanup(scenes);
    setScenes([]);
    setProgress(0);
    setStatus('Ready');
  }

  return (
    <section style={shell} aria-label="Original prompt sequence studio">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.8, fontWeight: 800, opacity: .7 }}>SEQUENCE DIRECTOR</div>
          <h3 style={{ margin: '6px 0 5px', fontSize: 22 }}>Turn one brief into a 3-shot scene</h3>
          <p style={{ margin: 0, opacity: .72, fontSize: 13, maxWidth: 680, lineHeight: 1.5 }}>
            Builds a coherent hook → build → hero sequence locally, with each generated shot deliberately varied but tied to the same creative brief.
          </p>
        </div>
        <span style={{ padding: '6px 9px', borderRadius: 999, background: 'rgba(110,216,255,.1)', fontSize: 11, fontWeight: 800 }}>3 SHOTS • 9:16</span>
      </div>

      <textarea value={prompt} onChange={event => setPrompt(event.target.value)} disabled={busy} rows={4} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', marginTop: 14, background: 'rgba(0,0,0,.22)', color: 'inherit', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: 12, lineHeight: 1.45 }} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
        <label style={{ fontSize: 12, opacity: .8 }}>Shot duration
          <select value={duration} onChange={event => setDuration(Number(event.target.value))} disabled={busy} style={{ display: 'block', marginTop: 5, background: 'rgba(0,0,0,.22)', color: 'inherit', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: 10 }}>
            {[3, 4, 5, 6].map(value => <option key={value} value={value}>{value} seconds</option>)}
          </select>
        </label>
        <button type="button" onClick={generateSequence} disabled={busy} style={{ border: 0, borderRadius: 10, padding: '11px 15px', fontWeight: 900, cursor: busy ? 'default' : 'pointer', background: '#6ed8ff', color: '#041019' }}>{busy ? `BUILDING ${progress}%` : '✦ BUILD 3-SHOT SEQUENCE'}</button>
        {scenes.length > 0 && <button type="button" onClick={addToFilm} disabled={busy} style={{ border: '1px solid rgba(110,216,255,.28)', borderRadius: 10, padding: '10px 14px', fontWeight: 900, cursor: 'pointer', background: 'rgba(110,216,255,.08)', color: 'inherit' }}>＋ USE ALL IN MY FILM</button>}
        {scenes.length > 0 && <button type="button" onClick={clear} disabled={busy} style={{ border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.05)', color: 'inherit' }}>CLEAR</button>}
        <span style={{ fontSize: 12, opacity: .7 }}>{status}{scenes.length ? ` • ${totalDuration.toFixed(0)}s generated` : ''}</span>
      </div>

      {busy && <div style={{ height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 99, overflow: 'hidden', marginTop: 12 }}><div style={{ height: '100%', width: `${progress}%`, background: '#6ed8ff', transition: 'width .12s linear' }} /></div>}

      {scenes.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 15 }}>
        {scenes.map(scene => <article key={`${scene.role}-${scene.url}`} style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, fontWeight: 900, opacity: .7, marginBottom: 6 }}>{scene.role}</div>
          <video src={scene.url} controls playsInline style={{ width: '100%', display: 'block', borderRadius: 12, background: '#000' }} />
          <button type="button" onClick={() => exportShot(scene)} disabled={busy} style={{ width: '100%', marginTop: 6, border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: 8, background: 'rgba(255,255,255,.04)', color: 'inherit', cursor: 'pointer', fontSize: 11 }}>EXPORT {scene.role}</button>
        </article>)}
      </div>}
    </section>
  );
}

function totalSeconds(items) {
  return items.reduce((sum, item) => sum + Number(item?.duration || 0), 0).toFixed(0);
}

function generatedCleanup(items) {
  items.forEach(item => { if (item?.url) URL.revokeObjectURL(item.url); });
}
